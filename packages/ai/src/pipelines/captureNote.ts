import { Type } from "@google/genai";
import { NOTE_CONTENT_TYPES } from "@vitals/shared";
import { z } from "zod";
import { DEFAULT_MODEL, getGeminiClient } from "../client";
import { buildCaptureNotePrompt } from "../prompts/captureNote";

export const noteExtractionSchema = z.object({
  contentType: z.enum(NOTE_CONTENT_TYPES),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  actionItems: z.array(z.string()),
});
export type NoteExtraction = z.infer<typeof noteExtractionSchema>;

export async function extractNoteFields(rawContent: string, sourceUrl?: string | null): Promise<NoteExtraction> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: DEFAULT_MODEL,
    contents: buildCaptureNotePrompt(rawContent, sourceUrl),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contentType: { type: Type.STRING, enum: [...NOTE_CONTENT_TYPES] },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["contentType", "title", "summary", "tags", "actionItems"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return a structured extraction");
  }

  return noteExtractionSchema.parse(JSON.parse(response.text));
}
