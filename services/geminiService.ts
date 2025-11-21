import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeTokenSurge = async (
  symbol: string,
  percentageChange: number,
  price: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key missing. Cannot generate analysis.";

  try {
    const prompt = `
      The cryptocurrency ${symbol} just experienced a significant ${percentageChange > 0 ? 'surge' : 'drop'} of ${percentageChange.toFixed(2)}% in the last minute. 
      The current price is ${price}.
      
      Please provide a concise analysis (max 100 words) covering:
      1. What is this token/project primarily used for? (Identify the sector: AI, Meme, DeFi, L1, etc.)
      2. Are there any known recent catalysts generally associated with this sector?
      3. A brief disclaimer that this is high volatility.
      
      Keep the tone professional but urgent, suitable for a trader dashboard.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to generate analysis due to an error.";
  }
};
