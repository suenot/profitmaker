import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * The static server-to-server bearer token (agents / scripts / curl → the
 * bootstrap user).
 *
 * There is deliberately NO fallback value. An unset or blank API_TOKEN DISABLES
 * this auth path entirely rather than silently enabling a well-known default
 * that anyone can read out of this (public) repo — a missing env must fail
 * closed, never open.
 */
const configured = process.env.API_TOKEN?.trim();
const API_TOKEN: string | null = configured ? configured : null;

const sha256 = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

// Precomputed so a comparison costs a single hash of the presented token.
const API_TOKEN_DIGEST: Buffer | null = API_TOKEN === null ? null : sha256(API_TOKEN);

/** True when an API_TOKEN is configured and the static-token path is available. */
export const isApiTokenEnabled = (): boolean => API_TOKEN_DIGEST !== null;

/**
 * Constant-time comparison against the configured API_TOKEN; always false when
 * none is configured. Comparing fixed-width SHA-256 digests rather than the raw
 * strings keeps timingSafeEqual from throwing on a length mismatch and stops a
 * caller from learning the token's length, or matching it byte-by-byte, from
 * response timing.
 */
export function matchesApiToken(token: string): boolean {
  if (API_TOKEN_DIGEST === null || !token) return false;
  return timingSafeEqual(sha256(token), API_TOKEN_DIGEST);
}
