import { NextRequest, NextResponse } from "next/server";

// Site-wide password gate: everything (pages AND the LLM-backed APIs) requires
// the access cookie issued by /api/gate. Assets and the gate itself are open.
// All responses carry X-Robots-Tag so crawlers/scrapers get nothing indexable.

const OPEN_PREFIXES = ["/_next", "/gate", "/api/gate", "/favicon"];
const OPEN_FILES = /\.(png|jpg|jpeg|webp|svg|ico|mp4|txt|woff2?)$/i;

function noIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN_PREFIXES.some((p) => pathname.startsWith(p)) || OPEN_FILES.test(pathname)) {
    return noIndex(NextResponse.next());
  }

  const authed = req.cookies.get("aura_access")?.value === "granted";
  if (authed) return noIndex(NextResponse.next());

  // APIs: hard 401, no redirect dance
  if (pathname.startsWith("/api/")) {
    return noIndex(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
  }

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  return noIndex(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
