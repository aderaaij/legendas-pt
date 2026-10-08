import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  isTargetLanguage,
} from "@/lib/i18n/languages";

/**
 * Hidden language prefix: every page lives under `app/[lang]/`, but URLs stay
 * unprefixed. Rewrite `/x` → `/{lang}/x` using the learner's selected target
 * language (cookie, default Portuguese), so each page is rendered — and
 * ISR-cached — per language without reading cookies in the render itself.
 */
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const lang = isTargetLanguage(cookie) ? cookie : DEFAULT_LANGUAGE;

  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and files with an extension
    // (favicon, public/ assets).
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
