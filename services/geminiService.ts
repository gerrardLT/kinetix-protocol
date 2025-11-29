import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeMarketEvent = async (question: string, description: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Analysis unavailable: Missing API Key.";

  try {
    const prompt = `
      Act as a financial analyst and prediction market expert.
      Analyze the following prediction market event:
      Question: "${question}"
      Context: "${description}"

      Provide a concise, neutral analysis of 3 key factors that could influence the outcome (YES or NO). 
      Do not predict the winner, just list the factors. 
      Keep it under 150 words. Format as a bulleted list.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis could not be generated at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating market analysis. Please try again later.";
  }
};
