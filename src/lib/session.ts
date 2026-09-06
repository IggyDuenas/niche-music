import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const COOKIE = "nm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type Session = {
  spotify?: {
    accessToken: string;
    refreshToken?: string;
    /** Unix seconds. */
    expiresAt: number;
    displayName?: string;
  };
};

function secret() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function readSession(): Promise<Session> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return {};
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.session as Session) ?? {};
  } catch {
    // Tampered, expired, or signed with an old secret — treat as logged out.
    return {};
  }
}

export async function writeSession(session: Session): Promise<void> {
  const token = await new SignJWT({ session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: env.appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
