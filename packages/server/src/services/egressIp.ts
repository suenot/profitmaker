/**
 * Public egress IP resolution.
 *
 * Exchange API keys are commonly IP-whitelisted, and when this server's address
 * isn't on the list the exchange rejects every call with an "unmatched IP"
 * error. Users used to have to ssh into the server to learn which address to
 * whitelist; this service resolves it so the 403 message and GET
 * /health/egress-ip can state it outright.
 *
 * The value is not a secret — it is the source address every exchange already
 * sees on every outgoing request this process makes — so exposing it carries no
 * risk. Responses are nothing but the IP; never log anything else from here.
 */

// Plain-text IP echo endpoints, tried in order. Two independent providers so
// one being down doesn't blank the IP from error messages.
const EGRESS_IP_SOURCES = ['https://api.ipify.org', 'https://ifconfig.me/ip'];

// Per-source cap: a hung echo service must not stall the caller (the health
// route awaits this; the 403 error path never does — it only reads the cache).
const FETCH_TIMEOUT_MS = 5_000;

// A resolved IP is good for minutes (egress changes only on failover or
// redeploy). A FAILED resolve is cached far shorter, so a transient provider
// outage doesn't keep the IP out of error messages for the full TTL.
const IP_TTL_MS = 5 * 60_000;
const NULL_TTL_MS = 30_000;

interface EgressIpCache {
  ip: string | null;
  expiresAt: number;
}

let cache: EgressIpCache | null = null;

// In-flight dedup: several consumers can fire at once (boot warmup, health
// probe, first exchange error) and they must share one resolve, not race N.
let inFlight: Promise<string | null> | null = null;

/** Accept a response body only if it looks like a bare IPv4/IPv6 literal. */
function looksLikeIp(text: string): boolean {
  return /^[0-9a-fA-F:.]+$/.test(text) && text.length < 64;
}

async function fetchFromSource(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const text = (await res.text()).trim();
    return looksLikeIp(text) ? text : null;
  } catch {
    // Timeout, DNS, TLS, connection refused — all just "source didn't answer".
    return null;
  }
}

async function resolveEgressIp(): Promise<string | null> {
  for (const url of EGRESS_IP_SOURCES) {
    const ip = await fetchFromSource(url);
    if (ip) return ip;
  }
  // One warn per failed cycle (not per source) — visible in logs without
  // spamming on every cache expiry during an outage.
  console.warn('[egress-ip] could not resolve the public egress IP; retrying on next use');
  return null;
}

/**
 * Resolve the public egress IP, serving the cache when fresh. Concurrent
 * callers share a single in-flight fetch. NEVER throws — null means "unknown",
 * and every caller (health route, 403 mapping) already handles that.
 */
export async function getEgressIp(): Promise<string | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.ip;
  if (inFlight) return inFlight;

  inFlight = resolveEgressIp()
    .then((ip) => {
      cache = { ip, expiresAt: Date.now() + (ip ? IP_TTL_MS : NULL_TTL_MS) };
      return ip;
    })
    .catch(() => null) // resolveEgressIp is already throw-free; contract insurance
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Synchronous peek at the last resolved IP — no network, null when unknown. */
export function getCachedEgressIp(): string | null {
  return cache && cache.expiresAt > Date.now() ? cache.ip : null;
}

/** Fire-and-forget resolve, called at boot so the first 403 already knows the IP. */
export function warmEgressIp(): void {
  void getEgressIp().catch(() => {});
}

/** Test-only: drop cache + in-flight state so assertions start from cold. */
export function __resetEgressIpForTests(): void {
  cache = null;
  inFlight = null;
}
