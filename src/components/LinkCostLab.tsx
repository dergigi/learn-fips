import { useState } from "react";

/**
 * Link-cost playground. Two configurable peer candidates (fiber, radio by
 * default). The user adjusts SRTT and loss for each and watches the
 * derived ETX, link_cost, and effective_depth numbers. The "winner"
 * highlights which peer the spanning-tree parent selection would pick,
 * given an optional hysteresis threshold.
 *
 * Formulas come verbatim from fips-mesh-layer.md and
 * spanning-tree-dynamics.md:
 *
 *   ETX              = 1 / ((1 - loss_rate) ^ 2)        // symmetric loss
 *   link_cost        = ETX * (1 + srtt_ms / 100)
 *   effective_depth  = peer.depth + link_cost
 *
 * The hysteresis rule: a new best candidate only displaces the current
 * parent when its effective_depth is less than
 *   current * (1 - parent_hysteresis)
 * The default parent_hysteresis in fips is 0.2 (20%).
 */

interface PeerState {
  id: string;
  label: string;
  srttMs: number;
  lossPercent: number;
  depth: number;
}

const DEFAULTS: PeerState[] = [
  { id: "fiber", label: "Fiber", srttMs: 1, lossPercent: 0, depth: 2 },
  { id: "radio", label: "Long-range radio", srttMs: 500, lossPercent: 5, depth: 1 },
];

function etx(lossPercent: number): number {
  const p = Math.max(0, Math.min(0.99, lossPercent / 100));
  const forward = 1 - p;
  const reverse = 1 - p;
  const product = forward * reverse;
  if (product <= 0.0001) return 1 / 0.0001;
  return 1 / product;
}

function linkCost(peer: PeerState): number {
  return etx(peer.lossPercent) * (1 + peer.srttMs / 100);
}

function effectiveDepth(peer: PeerState): number {
  return peer.depth + linkCost(peer);
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "∞";
  if (n >= 100) return n.toFixed(1);
  return n.toFixed(digits);
}

export default function LinkCostLab() {
  const [peers, setPeers] = useState<PeerState[]>(DEFAULTS);
  const [hysteresis, setHysteresis] = useState(0.2);
  const [currentParentId, setCurrentParentId] = useState<string>("fiber");

  const update = (id: string, patch: Partial<PeerState>) => {
    setPeers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const sorted = [...peers].sort((a, b) => effectiveDepth(a) - effectiveDepth(b));
  const best = sorted[0]!;
  const current = peers.find((p) => p.id === currentParentId) ?? best;
  const currentDepth = effectiveDepth(current);
  const bestDepth = effectiveDepth(best);
  const threshold = currentDepth * (1 - hysteresis);
  const willSwitch = best.id !== current.id && bestDepth < threshold;

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6">
      <div className="grid md:grid-cols-2 gap-4">
        {peers.map((peer) => {
          const cost = linkCost(peer);
          const ed = effectiveDepth(peer);
          const isBest = peer.id === best.id;
          const isCurrent = peer.id === currentParentId;
          return (
            <div
              key={peer.id}
              className={
                "rounded-lg border p-3 " +
                (isBest ? "border-fips-accent/60 bg-fips-accent/5" : "border-fips-border")
              }
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-fips-accent">{peer.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-fips-muted border border-fips-border rounded px-1">
                      current parent
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-fips-muted cursor-pointer">
                  <input
                    type="radio"
                    name="current-parent"
                    checked={isCurrent}
                    onChange={() => setCurrentParentId(peer.id)}
                    className="accent-fips-accent"
                  />
                  pick as current
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-fips-muted mb-2">
                <span className="w-20">SRTT (ms)</span>
                <input
                  type="range"
                  min={1}
                  max={1000}
                  value={peer.srttMs}
                  onChange={(e) => update(peer.id, { srttMs: Number(e.target.value) })}
                  className="flex-1 accent-fips-accent"
                />
                <span className="font-mono text-fips-text w-14 text-right">{peer.srttMs} ms</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-fips-muted mb-2">
                <span className="w-20">Loss</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={peer.lossPercent}
                  onChange={(e) => update(peer.id, { lossPercent: Number(e.target.value) })}
                  className="flex-1 accent-fips-accent"
                />
                <span className="font-mono text-fips-text w-14 text-right">
                  {peer.lossPercent}%
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-fips-muted mb-3">
                <span className="w-20">peer.depth</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={peer.depth}
                  onChange={(e) => update(peer.id, { depth: Number(e.target.value) })}
                  className="flex-1 accent-fips-accent"
                />
                <span className="font-mono text-fips-text w-14 text-right">{peer.depth}</span>
              </label>

              <dl className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <dt className="text-fips-muted">ETX</dt>
                  <dd className="text-fips-text">{fmt(etx(peer.lossPercent))}</dd>
                </div>
                <div>
                  <dt className="text-fips-muted">link_cost</dt>
                  <dd className="text-fips-text">{fmt(cost)}</dd>
                </div>
                <div>
                  <dt className="text-fips-muted">eff. depth</dt>
                  <dd className={isBest ? "text-fips-accent" : "text-fips-text"}>{fmt(ed)}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded border border-fips-border p-3 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2 text-fips-muted">
          <span>parent_hysteresis</span>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.05}
            value={hysteresis}
            onChange={(e) => setHysteresis(Number(e.target.value))}
            className="accent-fips-accent"
          />
          <span className="font-mono text-fips-text w-12 text-right">
            {(hysteresis * 100).toFixed(0)}%
          </span>
        </label>
        <div className="text-fips-muted font-mono">
          threshold = {fmt(currentDepth)} × (1 − {hysteresis.toFixed(2)}) ={" "}
          <span className="text-fips-text">{fmt(threshold)}</span>
        </div>
      </div>

      <p className="mt-3 text-sm" aria-live="polite">
        {best.id === current.id ? (
          <span className="text-fips-muted">
            <span className="text-fips-accent font-mono">{best.label}</span> is already the current
            parent with effective depth {fmt(bestDepth)}. No switch needed.
          </span>
        ) : willSwitch ? (
          <span className="text-fips-muted">
            Switch to <span className="text-fips-accent font-mono">{best.label}</span>. Its
            effective depth ({fmt(bestDepth)}) is below the hysteresis threshold ({fmt(threshold)}).
          </span>
        ) : (
          <span className="text-fips-muted">
            Stay on <span className="text-fips-accent font-mono">{current.label}</span>. The
            candidate <span className="font-mono">{best.label}</span> is better ({fmt(bestDepth)})
            but not by the hysteresis margin ({fmt(threshold)}).
          </span>
        )}
      </p>
    </div>
  );
}
