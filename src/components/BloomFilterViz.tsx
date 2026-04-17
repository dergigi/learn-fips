import { useState, useMemo } from "react";
import { BloomFilter } from "../lib/bloom";
import { nodeAddrFromId } from "../lib/mesh";
import { hexEncode } from "../lib/crypto";

const BIT_SIZE = 256; // bytes (2048 bits) for visualization
const HASH_COUNT = 5;
const GRID_COLS = 64;

export default function BloomFilterViz() {
  const [insertedNames, setInsertedNames] = useState<string[]>([]);
  const [queryName, setQueryName] = useState("");
  const [queryResult, setQueryResult] = useState<boolean | null>(null);
  const [inputName, setInputName] = useState("");

  const filter = useMemo(() => {
    const f = new BloomFilter(BIT_SIZE, HASH_COUNT);
    for (const name of insertedNames) {
      f.insert(nodeAddrFromId(name));
    }
    return f;
  }, [insertedNames]);

  function insertItem() {
    const name = inputName.trim();
    if (!name || insertedNames.includes(name)) return;
    setInsertedNames([...insertedNames, name]);
    setInputName("");
    setQueryResult(null);
  }

  function queryItem() {
    const name = queryName.trim();
    if (!name) return;
    setQueryResult(filter.query(nodeAddrFromId(name)));
  }

  function reset() {
    setInsertedNames([]);
    setInputName("");
    setQueryName("");
    setQueryResult(null);
  }

  const bitArray: boolean[] = [];
  for (let i = 0; i < BIT_SIZE * 8; i++) {
    bitArray.push(!!(filter.bits[i >> 3] & (1 << (i & 7))));
  }

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <h3 className="text-lg font-semibold mb-3">Bloom Filter</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && insertItem()}
          placeholder="Node name to insert..."
          className="px-3 py-1.5 rounded border border-fips-border bg-fips-bg text-sm font-mono text-fips-text placeholder:text-fips-muted/50 w-44"
        />
        <button onClick={insertItem} className="px-3 py-1.5 rounded bg-fips-accent text-fips-bg text-sm font-semibold">
          Insert
        </button>
        <input
          type="text"
          value={queryName}
          onChange={(e) => { setQueryName(e.target.value); setQueryResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && queryItem()}
          placeholder="Node name to query..."
          className="px-3 py-1.5 rounded border border-fips-border bg-fips-bg text-sm font-mono text-fips-text placeholder:text-fips-muted/50 w-44"
        />
        <button onClick={queryItem} className="px-3 py-1.5 rounded border border-fips-accent text-fips-accent text-sm font-semibold">
          Query
        </button>
        <button onClick={reset} className="px-3 py-1.5 rounded border border-fips-border text-fips-muted text-sm">
          Reset
        </button>
      </div>

      {queryResult !== null && (
        <p className={`text-sm mb-3 font-mono ${queryResult ? "text-fips-highlight" : "text-fips-green"}`}>
          {queryResult
            ? `"${queryName}" → MAYBE present (could be false positive)`
            : `"${queryName}" → DEFINITELY NOT present`
          }
        </p>
      )}

      {/* Bit grid */}
      <div className="overflow-x-auto mb-3">
        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 6px)` }}>
          {bitArray.map((bit, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-sm"
              style={{ backgroundColor: bit ? "#22d3ee" : "#1e2a3a" }}
            />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-xs font-mono text-fips-muted">
        <span>Bits: {BIT_SIZE * 8}</span>
        <span>Hashes: {HASH_COUNT}</span>
        <span>Inserted: {insertedNames.length}</span>
        <span>Fill: {(filter.fillRatio * 100).toFixed(1)}%</span>
        <span>Est. FPR: {(filter.estimatedFPR * 100).toFixed(3)}%</span>
      </div>

      {insertedNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {insertedNames.map((name) => (
            <span key={name} className="px-2 py-0.5 rounded-full bg-fips-accent/10 text-fips-accent text-xs font-mono">
              {name} → {hexEncode(nodeAddrFromId(name)).slice(0, 8)}...
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
