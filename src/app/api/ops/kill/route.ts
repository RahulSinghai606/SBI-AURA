import { NextRequest, NextResponse } from "next/server";
import { ops, setKill, KILL_COOKIE } from "@/lib/ops";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = ops().killSwitch;
  const engaged = s.engaged || req.cookies.get(KILL_COOKIE)?.value === "1";
  return NextResponse.json({ ...s, engaged });
}

export async function POST(req: NextRequest) {
  const { engaged, reason } = await req.json();
  setKill(Boolean(engaged), "Bank Officer · ops console", reason || (engaged ? "manual emergency stop" : "post-incident review complete"));
  // cookie backs the flag so the switch holds across serverless instances
  const res = NextResponse.json(ops().killSwitch);
  res.cookies.set(KILL_COOKIE, engaged ? "1" : "0", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 12 });
  return res;
}
