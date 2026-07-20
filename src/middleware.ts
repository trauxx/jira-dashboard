import { NextRequest, NextResponse } from "next/server";

const DOMAIN_MAP: Record<string, string> = {
  "roadmap.ingressosa.com": "/isa",
  "roadmap.meubilhete.com": "/mb",
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  const domain = Object.keys(DOMAIN_MAP).find((d) => host.includes(d));
  if (domain && pathname === "/") {
    return NextResponse.rewrite(new URL(DOMAIN_MAP[domain], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
