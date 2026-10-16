import { NextResponse, type NextRequest } from "next/server";

// Sub-domain → sub-site mapping, so sanitaryware.aquilo.in serves /sanitaryware.
// Kept local (proxy must not rely on shared app modules).
const SUBSITES = new Set(["sanitaryware", "exclusive", "altier"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  const sub = host.split(".")[0];
  if (!SUBSITES.has(sub)) return NextResponse.next();

  const url = request.nextUrl.clone();
  // Links inside a house already carry the /<house> prefix; only add it when missing.
  if (url.pathname === `/${sub}` || url.pathname.startsWith(`/${sub}/`)) return NextResponse.next();
  url.pathname = `/${sub}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|media|brand|hdri|models|favicon.ico|.*\\.(?:png|jpg|webp|svg|mp4)$).*)"],
};
