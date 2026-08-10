import { NextRequest, NextResponse } from "next/server";
import { ops, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// server-side translation cache: key `${lang}::${text}` → translated
const g = globalThis as unknown as { __txCache?: Map<string, string> };
const cache = (g.__txCache ??= new Map());

// Azure Translator — batch translate UI + content strings for instant vernacular.
export async function POST(req: NextRequest) {
  const { texts, to } = (await req.json()) as { texts: string[]; to: string };
  if (!Array.isArray(texts) || !to || to === "en") {
    return NextResponse.json({ translations: texts ?? [] });
  }
  const out: string[] = new Array(texts.length);
  const miss: { i: number; text: string }[] = [];
  texts.forEach((t, i) => {
    const hit = cache.get(`${to}::${t}`);
    if (hit !== undefined) out[i] = hit;
    else miss.push({ i, text: t });
  });

  // Azure Translator caps ~100 items / 50k chars per call — chunk defensively
  for (let c = 0; c < miss.length; c += 90) {
    const chunk = miss.slice(c, c + 90);
    try {
      const res = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${to}`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.AZURE_AI_KEY ?? "",
          "Ocp-Apim-Subscription-Region": process.env.AZURE_SPEECH_REGION ?? "eastus",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((m) => ({ Text: m.text }))),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await res.json()) as { translations: { text: string }[] }[];
      chunk.forEach((m, k) => {
        const tr = data?.[k]?.translations?.[0]?.text ?? m.text;
        cache.set(`${to}::${m.text}`, tr);
        out[m.i] = tr;
      });
    } catch {
      chunk.forEach((m) => (out[m.i] = m.text));
    }
  }
  ops().counters.requests++;
  if (miss.length) logEvent("i18n", `Translated ${miss.length} strings → ${to} (Azure Translator)`, "info");
  return NextResponse.json({ translations: out });
}
