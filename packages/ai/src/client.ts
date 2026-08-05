import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

// Called only from apps/api — packages/ai (and the Gemini API key it needs)
// must never be imported from apps/web.
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// "gemini-flash-latest" is a Google-maintained alias that always points at
// the current recommended fast/cheap model, so this doesn't need bumping
// every time a dated model version (e.g. gemini-2.5-flash) gets retired.
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
