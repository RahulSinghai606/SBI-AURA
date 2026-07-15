import { NextRequest, NextResponse } from "next/server";

// Exchanges the site password for an HttpOnly access cookie.
// Password lives in the SITE_PASSWORD env var — never in the client bundle.

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.SITE_PASSWORD;

  if (!expected || password !== expected) {
    // small delay to blunt brute force
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("aura_access", "granted", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
