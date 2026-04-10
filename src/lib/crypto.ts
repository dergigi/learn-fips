import { getPublicKey, utils } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

export interface FipsIdentity {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  npub: string;
  nodeAddr: Uint8Array;
  ipv6: string;
}

export function generateKeypair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = utils.randomPrivateKey();
  const publicKey = getPublicKey(privateKey, true); // compressed, 33 bytes
  return { privateKey, publicKey };
}

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (const c of hrp) ret.push(c.charCodeAt(0) >> 5);
  ret.push(0);
  for (const c of hrp) ret.push(c.charCodeAt(0) & 31);
  return ret;
}

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
  return ret;
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) {
    ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
}

export function deriveNpub(publicKey: Uint8Array): string {
  // npub uses x-only key (drop the 02/03 prefix byte)
  const xOnly = publicKey.slice(1);
  const hrp = "npub";
  const words = convertBits(xOnly, 8, 5, true);
  const checksum = bech32Checksum(hrp, words);
  return hrp + "1" + [...words, ...checksum].map((d) => BECH32_CHARSET[d]).join("");
}

export function deriveNodeAddr(publicKey: Uint8Array): Uint8Array {
  const hash = sha256(publicKey.slice(1)); // hash x-only key
  return hash.slice(0, 16); // truncate to 128 bits
}

export function deriveIPv6(nodeAddr: Uint8Array): string {
  // Prepend 0xfd to first 15 bytes of nodeAddr
  const bytes = new Uint8Array(16);
  bytes[0] = 0xfd;
  bytes.set(nodeAddr.slice(0, 15), 1);

  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  }
  return groups.join(":");
}

export function generateFullIdentity(): FipsIdentity {
  const { privateKey, publicKey } = generateKeypair();
  const npub = deriveNpub(publicKey);
  const nodeAddr = deriveNodeAddr(publicKey);
  const ipv6 = deriveIPv6(nodeAddr);
  return { privateKey, publicKey, npub, nodeAddr, ipv6 };
}

export function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
