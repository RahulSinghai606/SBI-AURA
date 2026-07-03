// Server-side client for the AURA Reasoning Engine.
// Talks to an Azure AI Foundry Responses API endpoint. The key never leaves the server.

const ENDPOINT = process.env.AZURE_AI_ENDPOINT ?? "";
const KEY = process.env.AZURE_AI_KEY ?? "";
const DEPLOYMENT = process.env.AZURE_AI_DEPLOYMENT ?? "";

type ResponsesOutput = {
  output?: { type: string; content?: { type: string; text?: string }[] }[];
  output_text?: string;
};

export async function reason(input: { system: string; user: string; maxTokens?: number }): Promise<string | null> {
  if (!ENDPOINT || !KEY || !DEPLOYMENT) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": KEY },
      body: JSON.stringify({
        model: DEPLOYMENT,
        instructions: input.system,
        input: input.user,
        max_output_tokens: input.maxTokens ?? 1600,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("Reasoning engine HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as ResponsesOutput;
    if (typeof data.output_text === "string" && data.output_text.length > 0) return data.output_text;
    const msg = data.output?.find((o) => o.type === "message");
    const text = msg?.content?.find((c) => c.type === "output_text")?.text;
    return text ?? null;
  } catch (e) {
    console.error("Reasoning engine error", e);
    return null;
  }
}

export function extractJson<T>(raw: string): T | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
