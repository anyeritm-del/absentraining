import { OAuth2Client } from "google-auth-library";

let cachedClient: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable");
  }
  if (!cachedClient) {
    cachedClient = new OAuth2Client(clientId);
  }
  return cachedClient;
}

/** Verifies a Google Identity Services ID token and returns the signed-in email, or null if invalid. */
export async function verifyGoogleIdToken(idToken: string): Promise<string | null> {
  try {
    const client = getClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return null;
    return payload.email;
  } catch {
    return null;
  }
}
