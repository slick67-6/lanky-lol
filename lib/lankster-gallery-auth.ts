export const LANKSTER_GALLERY_AUTH_COOKIE = "lankster-gallery-auth";

const LANKSTER_GALLERY_PASSWORD = "lanky";
const LANKSTER_GALLERY_AUTH_SECRET =
  process.env.LANKSTER_GALLERY_AUTH_SECRET ?? "lanky-lol-lankster-gallery-server-only-secret-v1";
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 8;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LANKSTER_GALLERY_AUTH_SECRET),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string) {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function isCorrectLanksterGalleryPassword(password: unknown) {
  return typeof password === "string" && password === LANKSTER_GALLERY_PASSWORD;
}

export async function createLanksterGalleryAuthToken(now = Date.now()) {
  const expiresAt = now + AUTH_MAX_AGE_SECONDS * 1000;
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ expiresAt })));
  return `${payload}.${await signPayload(payload)}`;
}

export async function isValidLanksterGalleryAuthToken(token: string | undefined) {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const key = await importSigningKey();
    const isSignatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
    if (!isSignatureValid) return false;

    const decoded = new TextDecoder().decode(base64UrlToBytes(payload));
    const data = JSON.parse(decoded) as { expiresAt?: unknown };
    return typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export const lanksterGalleryAuthCookieOptions = {
  httpOnly: true,
  maxAge: AUTH_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
