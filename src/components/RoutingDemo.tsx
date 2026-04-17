import { useState, useMemo } from "react";
import { buildSpanningTree, treeDistance, nodeAddrFromId } from "../lib/mesh";
import { hexEncode } from "../lib/crypto";
import type { MeshNode, Link } from "../lib/types";

function shortAddr(addr: Uint8Array): string {
  return hexEncode(addr).slice(0, 6);
}

function makeDemoMesh(): { nodes: Map<string, MeshNode> } {
  const names = ["A", "B", "C", "D", "E"];
  const nodes = new Map<string, MeshNode>();
  for (const id of names) {
    nodes.set(id, {
      id,
      nodeAddr: nodeAddrFromId(id),
      publicKey: new Uint8Array(33),
      coords: [],
      parent: null,
      peers: new Set(),
      x: 0,
      y: 0,
    });
  }

  const links: Link[] = [
    { a: "A", b: "B" },
    { a: "B", b: "C" },
    { a: "C", b: "D" },
    { a: "A", b: "D" },
    { a: "B", b: "E" },
  ];

  buildSpanningTree(nodes, links);
  return { nodes };
}

interface Step {
  label: string;
  detail: string;
  result: string | null;
  fired: boolean;
}

export default function RoutingDemo() {
  const { nodes } = useMemo(() => makeDemoMesh(), []);
  const [source, setSource] = useState("A");
  const [dest, setDest] = useState("D");
  const [stepIndex, setStepIndex] = useState(0);

  const nodeIds = Array.from(nodes.keys());
  const srcNode = nodes.get(source)!;
  const dstNode = nodes.get(dest)!;
  const isLocal = source === dest;
  const isDirect = srcNode.peers.has(dest);

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];

    s.push({
      label: "Local delivery check",
      detail: `Is ${source} === ${dest}?`,
      result: isLocal ? `Yes. Deliver locally.` : `No. Continue.`,
      fired: isLocal,
    });

    if (!isLocal) {
      s.push({
        label: "Direct peer check",
        detail: `Is ${dest} a direct peer of ${source}? Peers: [${Array.from(srcNode.peers).join(", ")}]`,
        result: isDirect ? `Yes. Forward directly to ${dest}.` : `No. Continue to greedy routing.`,
        fired: isDirect,
      });
    }

    if (!isLocal && !isDirect) {
      const myDist = treeDistance(srcNode.coords, dstNode.coords);
      const peerDistances: { peer: string; dist: number }[] = [];
      for (const peerId of srcNode.peers) {
        const peer = nodes.get(peerId)!;
        const d = treeDistance(peer.coords, dstNode.coords);
        peerDistances.push({ peer: peerId, dist: d });
      }
      peerDistances.sort((a, b) => a.dist - b.dist);

      const best = peerDistances[0];
      const found = best && best.dist < myDist;

      s.push({
        label: "Greedy tree routing",
        detail: `My tree distance to ${dest}: ${myDist}. Check each peer:`,
        result: peerDistances.map((p) => `${p.peer}: dist=${p.dist}`).join(", "),
        fired: false,
      });

      s.push({
        label: "Decision",
        detail: found
          ? `${best.peer} is closer (${best.dist} < ${myDist}). Forward to ${best.peer}.`
          : `No peer is closer. Routing fails (would backtrack in real implementation).`,
        result: found ? `Next hop: ${best.peer}` : "No route found",
        fired: true,
      });
    }

    return s;
  }, [source, dest, nodes, srcNode, dstNode, isLocal, isDirect]);

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <h3 className="text-lg font-semibold mb-3">
        Routing Decision: <code className="font-mono text-fips-accent">find_next_hop()</code>
      </h3>

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-fips-muted">Source:</span>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setStepIndex(0);
            }}
            className="bg-fips-bg border border-fips-border rounded px-2 py-1 text-fips-text font-mono"
          >
            {nodeIds.map((id) => (
              <option key={id} value={id}>
                {id} ({shortAddr(nodes.get(id)!.nodeAddr)})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-fips-muted">Dest:</span>
          <select
            value={dest}
            onChange={(e) => {
              setDest(e.target.value);
              setStepIndex(0);
            }}
            className="bg-fips-bg border border-fips-border rounded px-2 py-1 text-fips-text font-mono"
          >
            {nodeIds.map((id) => (
              <option key={id} value={id}>
                {id} ({shortAddr(nodes.get(id)!.nodeAddr)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2 mb-4">
        {steps.map((step, i) => {
          const visible = i <= stepIndex;
          return (
            <div
              key={i}
              className={`rounded border p-3 transition-all ${
                visible
                  ? step.fired
                    ? "border-fips-accent bg-fips-accent/5"
                    : "border-fips-border bg-fips-surface/30"
                  : "border-fips-border/30 bg-fips-bg/30 opacity-30"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-fips-accent font-mono text-xs">#{i + 1}</span>
                <span className="font-semibold">{step.label}</span>
                {step.fired && visible && (
                  <span className="text-fips-green text-xs ml-auto">FIRED</span>
                )}
              </div>
              {visible && (
                <div className="mt-1 text-sm text-fips-muted font-mono">
                  <p>{step.detail}</p>
                  {step.result && <p className="text-fips-text mt-1">{step.result}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="px-3 py-1 rounded border border-fips-border text-fips-muted disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={() => setStepIndex(Math.min(steps.length - 1, stepIndex + 1))}
          disabled={stepIndex >= steps.length - 1}
          className="px-3 py-1 rounded border border-fips-border text-fips-accent disabled:opacity-30"
        >
          Next →
        </button>
        <button
          onClick={() => setStepIndex(steps.length - 1)}
          className="px-3 py-1 rounded border border-fips-border text-fips-muted"
        >
          Show All
        </button>
      </div>

      <div className="mt-4 text-xs text-fips-muted">
        Topology: A—B—C—D, A—D, B—E. Root: smallest node_addr.
      </div>
    </div>
  );
}
