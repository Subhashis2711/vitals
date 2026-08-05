import { DEFAULT_MODEL, getGeminiClient } from "../client";
import { buildMarkdownFromTextPrompt } from "../prompts/markdownFromText";

export async function inferMarkdownFromText(text: string): Promise<string> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: DEFAULT_MODEL,
    contents: buildMarkdownFromTextPrompt(text),
  });

  if (!response.text) {
    throw new Error("Gemini did not return a text response");
  }

  return response.text.trim();
}
