import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env';

export interface AccessPayload {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

/** Opaque refresh token (stored hashed-adjacent, never sent to client in a JWT). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/** Converts "7d", "12h", "30m" into a future Date. */
export function refreshExpiry(): Date {
  const ttl = env.JWT_REFRESH_TTL;
  const match = /^(\d+)\s*([smhd])$/.exec(ttl);
  if (!match) throw new Error(`Invalid JWT_REFRESH_TTL: ${ttl}`);
  const n = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return new Date(Date.now() + n * ms);
}
