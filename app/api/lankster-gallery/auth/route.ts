import {
  createLanksterGalleryAuthToken,
  isCorrectLanksterGalleryPassword,
  LANKSTER_GALLERY_AUTH_COOKIE,
  lanksterGalleryAuthCookieOptions,
} from "@/lib/lankster-gallery-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let password: unknown;

  try {
    const body = (await request.json()) as { password?: unknown };
    password = body.password;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  if (!isCorrectLanksterGalleryPassword(password)) {
    return NextResponse.json({ ok: false, message: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    LANKSTER_GALLERY_AUTH_COOKIE,
    await createLanksterGalleryAuthToken(),
    lanksterGalleryAuthCookieOptions,
  );
  return response;
}
