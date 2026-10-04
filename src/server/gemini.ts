import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function generateContentSafe(params: {
  contents: any;
  config?: any;
  model?: string;
}) {
  const model = params.model || 'gemini-3.8-flash';
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      // If 429 (rate limit) or 503 (transient overload), back off and retry
      if (
        status === 429 ||
        status === 503 ||
        err?.message?.includes('quota') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('demand') ||
        err?.message?.includes('overloaded')
      ) {
        console.warn(`Model ${model} returned ${status || 'RATE_LIMITED'} on attempt ${attempt}/${maxRetries}. Retrying...`);
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
