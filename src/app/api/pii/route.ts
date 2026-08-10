import { NextRequest, NextResponse } from "next/server";
import { piiScan, logEvent } from "@/lib/ops";

export const maxDuration = 30;

// DPDP Guard endpoint — live PII detection/redaction (Azure AI Language).
export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });
  const result = await piiScan(text);
  logEvent("dpdp-guard", `PII scan: ${result.entities.length} identifier(s) ${result.entities.length ? "REDACTED" : "found"} in ${result.ms}ms`, result.entities.length ? "warn" : "info");
  return NextResponse.json(result);
}
