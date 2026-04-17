import { describe, it, expect } from "vitest";
import {
  deriveNpub,
  deriveNodeAddr,
  deriveIPv6,
  generateFullIdentity,
  generateKeypair,
  hexEncode,
} from "../src/lib/crypto";

function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

describe("deriveNpub", () => {
  // NIP-19 test vector: x-only pubkey -> npub bech32.
  // Source: NIP-19 spec example.
  it("matches the NIP-19 vector", () => {
    const xOnly = hexDecode(
      "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"
    );
    const compressed = new Uint8Array(33);
    compressed[0] = 0x02;
    compressed.set(xOnly, 1);
    expect(deriveNpub(compressed)).toBe(
      "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
    );
  });

  it("produces a bech32 string of the expected shape", () => {
    const { publicKey } = generateKeypair();
    const npub = deriveNpub(publicKey);
    expect(npub.startsWith("npub1")).toBe(true);
    // 5-char hrp + "1" + 52 data + 6 checksum = 63 chars
    expect(npub.length).toBe(63);
  });

  it("is independent of the compressed prefix byte (x-only)", () => {
    const xOnly = hexDecode(
      "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"
    );
    const a = new Uint8Array(33);
    a[0] = 0x02;
    a.set(xOnly, 1);
    const b = new Uint8Array(33);
    b[0] = 0x03;
    b.set(xOnly, 1);
    expect(deriveNpub(a)).toBe(deriveNpub(b));
  });
});

describe("deriveNodeAddr", () => {
  it("returns 16 bytes", () => {
    const { publicKey } = generateKeypair();
    expect(deriveNodeAddr(publicKey).length).toBe(16);
  });

  it("is deterministic", () => {
    const { publicKey } = generateKeypair();
    const a = deriveNodeAddr(publicKey);
    const b = deriveNodeAddr(publicKey);
    expect(hexEncode(a)).toBe(hexEncode(b));
  });

  it("ignores the compressed prefix byte", () => {
    const xOnly = hexDecode(
      "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"
    );
    const a = new Uint8Array(33);
    a[0] = 0x02;
    a.set(xOnly, 1);
    const b = new Uint8Array(33);
    b[0] = 0x03;
    b.set(xOnly, 1);
    expect(hexEncode(deriveNodeAddr(a))).toBe(hexEncode(deriveNodeAddr(b)));
  });
});

describe("deriveIPv6", () => {
  it("lives in fd00::/8 (ULA)", () => {
    const addr = new Uint8Array(16);
    const ipv6 = deriveIPv6(addr);
    const firstGroup = ipv6.split(":")[0];
    expect(parseInt(firstGroup, 16) >>> 8).toBe(0xfd);
  });

  it("has 8 colon-separated groups", () => {
    const addr = new Uint8Array(16);
    for (let i = 0; i < 16; i++) addr[i] = i;
    expect(deriveIPv6(addr).split(":").length).toBe(8);
  });

  it("encodes the address bytes predictably", () => {
    // nodeAddr of all 0xff → fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff (first 15 bytes used)
    const addr = new Uint8Array(16).fill(0xff);
    expect(deriveIPv6(addr)).toBe("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff");
  });
});

describe("generateFullIdentity", () => {
  it("produces a consistent set of derived values", () => {
    const id = generateFullIdentity();
    expect(id.privateKey.length).toBe(32);
    expect(id.publicKey.length).toBe(33);
    expect(id.nodeAddr.length).toBe(16);
    expect(id.npub.startsWith("npub1")).toBe(true);
    expect(id.ipv6.split(":").length).toBe(8);
    // nodeAddr and ipv6 must be derivable from publicKey
    expect(hexEncode(deriveNodeAddr(id.publicKey))).toBe(
      hexEncode(id.nodeAddr)
    );
    expect(deriveIPv6(id.nodeAddr)).toBe(id.ipv6);
    expect(deriveNpub(id.publicKey)).toBe(id.npub);
  });
});
