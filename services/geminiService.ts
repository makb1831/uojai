import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';
import type { DatasetInfo } from '../types';

let geminiAI: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

if (apiKey && apiKey.trim() !== "") {
  try {
    geminiAI = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    geminiAI = null; // Ensure it's null if initialization fails
  }
}

export function isApiKeyMissing(): boolean {
  return !apiKey || apiKey.trim() === "" || !geminiAI;
}

export async function getAiResponse(
  datasetInfo: DatasetInfo,
  question: string
): Promise<string> {
  if (!geminiAI) {
    throw new Error("AI client not initialized. This might be due to a missing API key. Please ensure the API_KEY environment variable is set.");
  }

  const { content: fileContent, topicName } = datasetInfo;

  // Refined prompt for better persona and context handling
  const prompt = `
You are an expert assistant for "${topicName}". Your entire knowledge base for this role is provided below.
Your goal is to answer user questions accurately and comprehensively, drawing ONLY from this specific knowledge base.
Speak directly as the "${topicName}" assistant. Avoid phrases like "Based on the document..." or "The provided text says...". Instead, state the information directly as if it is your own knowledge.

If a question cannot be answered using ONLY the information in your knowledge base, clearly state that you don't have information on that specific query within the context of "${topicName}". Do not attempt to answer from outside this scope.

Knowledge Base for "${topicName}":
---
${fileContent}
---

User's Question: "${question}"

Please provide the answer:
  `;

  try {
    const response: GenerateContentResponse = await geminiAI.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      // Be more generic in error message to user, but log specific error
      return `Sorry, I encountered a technical issue while processing your request for "${topicName}". Please try again later.`;
    }
    return `An unknown error occurred while trying to assist with "${topicName}".`;
  }
}