/**
 * Protocol numbers referenced across lessons and quizzes.
 *
 * Keep this file as the single source of truth; any copy in prose or quiz
 * explanations should import from here (or be double-checked against it).
 */

/** Compressed secp256k1 public key size in bytes. */
export const PUBKEY_BYTES = 33;

/** x-only (Schnorr / Nostr) public key size in bytes. */
export const XONLY_PUBKEY_BYTES = 32;

/** node_addr = SHA-256(x-only pubkey) truncated to this many bytes. */
export const NODE_ADDR_BYTES = 16;

/** ULA prefix byte prepended to the first 15 bytes of node_addr. */
export const IPV6_ULA_PREFIX = 0xfd;

/** Base FIPS per-packet overhead (FSP + FMP + routing envelope) in bytes. */
export const FIPS_BASE_OVERHEAD = 106;

/** Bytes saved per packet by the IPv6 header compression in the TUN adapter. */
export const FIPS_IPV6_HEADER_SAVINGS = 33;

/** Per-session port header added by the IPv6 adapter, in bytes. */
export const FIPS_IPV6_PORT_HEADER = 4;

/** Net per-packet overhead for IPv6 traffic through FIPS. */
export const FIPS_IPV6_OVERHEAD =
  FIPS_BASE_OVERHEAD - FIPS_IPV6_HEADER_SAVINGS + FIPS_IPV6_PORT_HEADER;
