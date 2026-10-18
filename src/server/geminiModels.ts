// src/server/geminiModels.ts
// Google retires and renames Gemini models often, and a model that works for one API key can
// return 404 for another. Try a short list in order and remember the first one that answers,
// so one retired model name can't silently push the whole app into Basic mode.
import { GoogleGenAI } from '@google/genai';

const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash'
];

let workingModel: string | null = null;

function candidateModels(preferred: Array<string | undefined>): string[] {
  const list = [workingModel, ...preferred, ...FALLBACK_MODELS]
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .map((m) => m.trim());
  return [...new Set(list)];
}

function isModelNotFound(err: any): boolean {
  const status = Number(err?.status ?? err?.code ?? 0);
  const msg = String(err?.message ?? err ?? '');
  return status === 404 || /not[ _]found|is not supported|does not exist|unknown model/i.test(msg);
}

/** Generate JSON with the first model that exists for this key. Non-404 errors (429, 5xx, bad key) are thrown as-is. */
export async function generateJsonWithFallback(
  ai: GoogleGenAI,
  contents: string,
  preferred: Array<string | undefined>
): Promise<{ text: string; model: string }> {
  let lastErr: any = null;
  for (const model of candidateModels(preferred)) {
    try {
      const response = await ai.models.generateContent({ model, contents, config: { responseMimeType: 'application/json' } });
      if (workingModel !== model) {
        workingModel = model;
        console.log(`[gemini] using model ${model}`);
      }
      return { text: response.text?.trim() ?? '', model };
    } catch (err: any) {
      if (!isModelNotFound(err)) throw err;
      console.warn(`[gemini] model ${model} not available for this key, trying the next one`);
      if (workingModel === model) workingModel = null;
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('No Gemini model available');
}
