/**
 * Decodes a JWT payload WITHOUT verifying its signature. Only safe for
 * display/UX purposes (e.g. showing "signed in as x@gmail.com" before
 * submitting) — the server independently verifies the token for real.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
