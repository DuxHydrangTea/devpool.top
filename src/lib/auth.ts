import { SignJWT, jwtVerify } from 'jose';
import { getRequestEvent } from "solid-js/web";

// Sử dụng biến môi trường JWT_SECRET, hoặc mặc định nếu chưa kịp load
const secretStr = process.env.JWT_SECRET || 'super_secret_jwt_key_1234567890';
const secret = new TextEncoder().encode(secretStr);

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

export function getAuthCookie() {
  const event = getRequestEvent();
  if (!event) return null;
  const cookieHeader = event.request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(^| )admin_token=([^;]+)/);
  return match ? match[2] : null;
}

export async function requireAuth() {
  const token = getAuthCookie();
  if (!token) throw new Error("Unauthorized: No token provided");
  const payload = await verifyToken(token);
  if (!payload) throw new Error("Unauthorized: Invalid token");
  return payload;
}
