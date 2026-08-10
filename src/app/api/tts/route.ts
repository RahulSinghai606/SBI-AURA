import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Azure Neural TTS — vernacular speech for insights (server-side key).
const VOICES: Record<string, string> = {
  en: "en-IN-NeerjaNeural",
  hi: "hi-IN-SwaraNeural",
  gu: "gu-IN-DhwaniNeural",
  mr: "mr-IN-AarohiNeural",
};
const LOCALE: Record<string, string> = { en: "en-IN", hi: "hi-IN", gu: "gu-IN", mr: "mr-IN" };

export async function POST(req: NextRequest) {
  const { text, lang = "en" } = await req.json();
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });
  const voice = VOICES[lang] ?? VOICES.en;
  const ssml = `<speak version="1.0" xml:lang="${LOCALE[lang] ?? "en-IN"}"><voice name="${voice}"><prosody rate="+2%">${String(text).slice(0, 900).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</prosody></voice></speak>`;
  const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION ?? "eastus"}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_AI_KEY ?? "",
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!res.ok) return NextResponse.json({ error: "tts failed" }, { status: 502 });
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
