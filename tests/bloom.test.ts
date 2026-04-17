import { describe, it, expect } from "vitest";
import { BloomFilter } from "../src/lib/bloom";

function bytesOf(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("BloomFilter", () => {
  it("reports inserted items as present", () => {
    const bf = new BloomFilter(256, 4);
    for (const s of ["alice", "bob", "carol"]) bf.insert(bytesOf(s));
    expect(bf.query(bytesOf("alice"))).toBe(true);
    expect(bf.query(bytesOf("bob"))).toBe(true);
    expect(bf.query(bytesOf("carol"))).toBe(true);
  });

  it("has no false negatives over a large insertion run", () => {
    const bf = new BloomFilter(4096, 6);
    const items: Uint8Array[] = [];
    for (let i = 0; i < 500; i++) {
      const item = bytesOf(`node-${i}`);
      items.push(item);
      bf.insert(item);
    }
    for (const item of items) {
      expect(bf.query(item)).toBe(true);
    }
  });

  it("keeps the empirical FPR close to the estimate", () => {
    const bf = new BloomFilter(2048, 5);
    const inserted = 300;
    for (let i = 0; i < inserted; i++) bf.insert(bytesOf(`in-${i}`));
    let falsePositives = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      if (bf.query(bytesOf(`out-${i}`))) falsePositives++;
    }
    const empirical = falsePositives / trials;
    // Estimated FPR gives a tight theoretical bound; we allow 3x slack.
    expect(empirical).toBeLessThan(bf.estimatedFPR * 3 + 0.02);
  });

  it("tracks insertion count", () => {
    const bf = new BloomFilter(128, 3);
    bf.insert(bytesOf("a"));
    bf.insert(bytesOf("b"));
    expect(bf.count).toBe(2);
  });

  it("merges two filters into a superset", () => {
    const a = new BloomFilter(512, 4);
    const b = new BloomFilter(512, 4);
    a.insert(bytesOf("apple"));
    b.insert(bytesOf("banana"));
    const m = BloomFilter.merge(a, b);
    expect(m.query(bytesOf("apple"))).toBe(true);
    expect(m.query(bytesOf("banana"))).toBe(true);
  });

  it("refuses to merge mismatched filters", () => {
    const a = new BloomFilter(256, 4);
    const b = new BloomFilter(512, 4);
    expect(() => BloomFilter.merge(a, b)).toThrow();
  });

  it("reports a non-decreasing fill ratio", () => {
    const bf = new BloomFilter(256, 3);
    const ratios: number[] = [bf.fillRatio];
    for (let i = 0; i < 20; i++) {
      bf.insert(bytesOf(`x-${i}`));
      ratios.push(bf.fillRatio);
    }
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]!).toBeGreaterThanOrEqual(ratios[i - 1]!);
    }
  });
});
