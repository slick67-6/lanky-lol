import {
  isValidLanksterGalleryAuthToken,
  LANKSTER_GALLERY_AUTH_COOKIE,
} from "@/lib/lankster-gallery-auth";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const isAuthenticated = await isValidLanksterGalleryAuthToken(
    request.cookies.get(LANKSTER_GALLERY_AUTH_COOKIE)?.value,
  );

  if (isAuthenticated) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: "/lankster-gallery/:path*",
};
