import { sha256 } from "@noble/hashes/sha2.js";

export class BloomFilter {
  readonly bits: Uint8Array;
  readonly bitCount: number;
  readonly hashCount: number;
  private insertions = 0;

  constructor(byteSize = 1024, hashCount = 5) {
    this.bits = new Uint8Array(byteSize);
    this.bitCount = byteSize * 8;
    this.hashCount = hashCount;
  }

  private hashIndices(item: Uint8Array): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.hashCount; i++) {
      const input = new Uint8Array(item.length + 1);
      input.set(item);
      input[item.length] = i;
      const hash = sha256(input);
      const val = (hash[0]! << 24) | (hash[1]! << 16) | (hash[2]! << 8) | hash[3]!;
      indices.push(Math.abs(val) % this.bitCount);
    }
    return indices;
  }

  insert(item: Uint8Array): void {
    for (const idx of this.hashIndices(item)) {
      this.bits[idx >> 3]! |= 1 << (idx & 7);
    }
    this.insertions++;
  }

  query(item: Uint8Array): boolean {
    for (const idx of this.hashIndices(item)) {
      if (!(this.bits[idx >> 3]! & (1 << (idx & 7)))) return false;
    }
    return true;
  }

  get fillRatio(): number {
    let set = 0;
    for (const byte of this.bits) {
      let b = byte;
      while (b) {
        set += b & 1;
        b >>= 1;
      }
    }
    return set / this.bitCount;
  }

  get estimatedFPR(): number {
    // FPR = (1 - e^(-kn/m))^k
    const k = this.hashCount;
    const n = this.insertions;
    const m = this.bitCount;
    return Math.pow(1 - Math.exp((-k * n) / m), k);
  }

  get count(): number {
    return this.insertions;
  }

  static merge(a: BloomFilter, b: BloomFilter): BloomFilter {
    if (a.bitCount !== b.bitCount || a.hashCount !== b.hashCount) {
      throw new Error("Cannot merge filters with different parameters");
    }
    const merged = new BloomFilter(a.bits.length, a.hashCount);
    for (let i = 0; i < a.bits.length; i++) {
      merged.bits[i] = a.bits[i]! | b.bits[i]!;
    }
    return merged;
  }
}
