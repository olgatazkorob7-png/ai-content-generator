import OpenAI from 'openai';

const llm = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export const DEFAULT_MODEL = process.env.KODIKROUTER_MODEL || 'openai/gpt-4o';

export interface GenerateJsonParams {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}

export async function generateJSON({
  system,
  user,
  model,
  temperature = 0.7,
}: GenerateJsonParams): Promise<Record<string, unknown>> {
  const completion = await llm.chat.completions.create({
    model: model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[LLM] NON-JSON RESPONSE:', raw);
    throw new Error('LLM did not return valid JSON');
  }
}
