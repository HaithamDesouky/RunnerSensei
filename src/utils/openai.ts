import * as SecureStore from "expo-secure-store";
import { Run } from "../types";

// Use SecureStore to keep the OpenAI key in the platform keychain/keystore.
// SecureStore keys must only contain alphanumeric characters, '.', '-', and '_'.
export const OPENAI_STORAGE_KEY = "RunnerSensei_openaiKey";

export async function setOpenAIKey(key: string | null) {
  if (!key) return SecureStore.deleteItemAsync(OPENAI_STORAGE_KEY);
  return SecureStore.setItemAsync(OPENAI_STORAGE_KEY, key.trim());
}

export async function getOpenAIKey(): Promise<string | null> {
  return SecureStore.getItemAsync(OPENAI_STORAGE_KEY);
}

export interface AISuggestion {
  targetDistanceKm: number;
  intensity: "Rest" | "Easy" | "Moderate" | "Strong";
  estimatedDurationMin: number;
  message: string;
  warnings: string[];
}

/** Calls OpenAI Chat Completions to generate a Sensei suggestion.
 * Returns parsed JSON matching AISuggestion. Throws on errors. */
export async function generateSuggestionAI(
  runs: Run[],
  feeling: string,
  apiKey: string,
): Promise<AISuggestion> {
  const recent = runs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((r) => ({
      date: r.date,
      km: +(r.distanceMeters / 1000).toFixed(2),
      durationMin: Math.round(r.durationMs / 1000 / 60),
      preRunNote: r.preRunNote || "",
    }));

  const system = `You are RunnerSensei, a concise running coach. Given a short history of runs and a one-line "feeling" from the user, return a single JSON object with the following keys exactly: targetDistanceKm (number), intensity (one of Rest, Easy, Moderate, Strong), estimatedDurationMin (integer), message (short advice string), warnings (array of short strings). Output only JSON, no extra text.`;

  const user = `Runs: ${JSON.stringify(recent)}\nFeeling: "${feeling.trim()}"\nGuidelines: prefer conservative suggestions; if injury words (pain, injured, knee, ankle, shin, sprain) present, suggest Rest. Keep message short (<=120 chars).`;

  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 300,
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  // The model is instructed to return pure JSON; try to parse the first JSON object found
  try {
    const parsed = JSON.parse(content);
    return parsed as AISuggestion;
  } catch (e) {
    // Try to extract JSON substring
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as AISuggestion;
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

