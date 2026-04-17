import { useState, useMemo } from "react";
import { BloomFilter } from "../lib/bloom";
import { DEMO_NODE_LABELS, nodeAddrFromId } from "../lib/mesh";
import { hexEncode } from "../lib/crypto";

const BIT_SIZE = 256; // bytes (2048 bits) for visualization
const HASH_COUNT = 5;
const GRID_COLS = 64;

const NODE_IDS: readonly string[] = DEMO_NODE_LABELS;

function firstNotIn(list: string[], exclude: ReadonlySet<string>): string {
  for (const id of list) if (!exclude.has(id)) return id;
  return list[0]!;
}

export default function BloomFilterViz() {
  const [insertedNames, setInsertedNames] = useState<string[]>([]);
  const insertedSet = useMemo(() => new Set(insertedNames), [insertedNames]);
  const [insertPick, setInsertPick] = useState<string>(NODE_IDS[0]!);
  const [queryPick, setQueryPick] = useState<string>(NODE_IDS[0]!);
  const [queryResult, setQueryResult] = useState<{ name: string; hit: boolean } | null>(null);

  const filter = useMemo(() => {
    const f = new BloomFilter(BIT_SIZE, HASH_COUNT);
    for (const name of insertedNames) {
      f.insert(nodeAddrFromId(name));
    }
    return f;
  }, [insertedNames]);

  function insertItem(name: string) {
    if (!name || insertedSet.has(name)) return;
    const next = [...insertedNames, name];
    setInsertedNames(next);
    const nextSet = new Set(next);
    setInsertPick(firstNotIn(NODE_IDS as string[], nextSet));
    setQueryResult(null);
  }

  function queryItem(name: string) {
    if (!name) return;
    setQueryResult({ name, hit: filter.query(nodeAddrFromId(name)) });
  }

  function reset() {
    setInsertedNames([]);
    setInsertPick(NODE_IDS[0]!);
    setQueryPick(NODE_IDS[0]!);
    setQueryResult(null);
  }

  const bitArray: boolean[] = [];
  for (let i = 0; i < BIT_SIZE * 8; i++) {
    bitArray.push(!!(filter.bits[i >> 3]! & (1 << (i & 7))));
  }

  const allInserted = insertedNames.length === NODE_IDS.length;

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <h3 className="text-lg font-semibold mb-1">Bloom Filter</h3>
      <p className="text-xs text-fips-muted mb-3">
        Same ten demo nodes as the mesh simulator. Insert a few, then query a name you never
        inserted to see when the filter lies.
      </p>

      <div className="flex flex-wrap gap-2 mb-3 items-end">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-fips-muted font-mono uppercase tracking-wide">Insert</span>
          <select
            value={insertPick}
            onChange={(e) => setInsertPick(e.target.value)}
            className="px-3 py-1.5 rounded border border-fips-border bg-fips-bg text-sm font-mono text-fips-text"
          >
            {NODE_IDS.map((id) => (
              <option key={id} value={id} disabled={insertedSet.has(id)}>
                {id}
                {insertedSet.has(id) ? " (inserted)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => insertItem(insertPick)}
          disabled={allInserted || insertedSet.has(insertPick)}
          className="px-3 py-1.5 rounded bg-fips-accent text-fips-bg text-sm font-semibold disabled:opacity-40"
        >
          Insert
        </button>

        <label className="flex flex-col gap-1 text-xs ml-0 sm:ml-4">
          <span className="text-fips-muted font-mono uppercase tracking-wide">Query</span>
          <select
            value={queryPick}
            onChange={(e) => {
              setQueryPick(e.target.value);
              setQueryResult(null);
            }}
            className="px-3 py-1.5 rounded border border-fips-border bg-fips-bg text-sm font-mono text-fips-text"
          >
            {NODE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
                {insertedSet.has(id) ? " (inserted)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => queryItem(queryPick)}
          className="px-3 py-1.5 rounded border border-fips-accent text-fips-accent text-sm font-semibold"
        >
          Query
        </button>

        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 rounded border border-fips-border text-fips-muted text-sm ml-auto"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-3" aria-label="Quick insert">
        <span className="text-xs text-fips-muted mr-1 self-center">Quick insert:</span>
        {NODE_IDS.map((id) => {
          const done = insertedSet.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => insertItem(id)}
              disabled={done}
              className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                done
                  ? "border-fips-accent/30 bg-fips-accent/10 text-fips-accent/70 cursor-default"
                  : "border-fips-border hover:border-fips-accent/50 text-fips-text"
              }`}
              aria-pressed={done}
            >
              {id}
            </button>
          );
        })}
      </div>

      {queryResult && (
        <p
          className={`text-sm mb-3 font-mono ${queryResult.hit ? "text-fips-highlight" : "text-fips-green"}`}
        >
          {queryResult.hit
            ? `"${queryResult.name}" → MAYBE present${
                insertedSet.has(queryResult.name) ? "" : " (false positive)"
              }`
            : `"${queryResult.name}" → DEFINITELY NOT present`}
        </p>
      )}

      <div className="overflow-x-auto mb-3">
        <div
          className="inline-grid gap-px"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 6px)` }}
        >
          {bitArray.map((bit, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-sm"
              style={{ backgroundColor: bit ? "#22d3ee" : "#1e2a3a" }}
            />
          ))}
        </div>
      </div>

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
            <span
              key={name}
              className="px-2 py-0.5 rounded-full bg-fips-accent/10 text-fips-accent text-xs font-mono"
            >
              {name} → {hexEncode(nodeAddrFromId(name)).slice(0, 8)}...
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
