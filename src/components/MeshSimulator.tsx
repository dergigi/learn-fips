import { useState, useRef, useCallback, useEffect } from "react";
import {
  buildSpanningTree,
  createDemoNodes,
  createDemoLinks,
  findNextHop,
  compareNodeAddr,
} from "../lib/mesh";
import { hexEncode } from "../lib/crypto";
import type { MeshNode, Link } from "../lib/types";

const WIDTH = 700;
const HEIGHT = 420;
const NODE_RADIUS = 18;

function shortAddr(addr: Uint8Array): string {
  return hexEncode(addr).slice(0, 6);
}

export default function MeshSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Map<string, MeshNode>>(() =>
    createDemoNodes(10, WIDTH, HEIGHT)
  );
  const [links, setLinks] = useState<Link[]>(() => createDemoLinks(nodes));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [routeFrom, setRouteFrom] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);

  const rebuild = useCallback((n: Map<string, MeshNode>, l: Link[]) => {
    const copy = new Map(
      Array.from(n.entries()).map(([k, v]) => [k, { ...v, peers: new Set(v.peers) }])
    );
    buildSpanningTree(copy, l);
    return copy;
  }, []);

  useEffect(() => {
    const built = rebuild(nodes, links);
    setNodes(built);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rootId =
    Array.from(nodes.values()).reduce<MeshNode | null>((best, n) => {
      if (!best || compareNodeAddr(n.nodeAddr, best.nodeAddr) < 0) return n;
      return best;
    }, null)?.id ?? null;

  const treeEdges = new Set<string>();
  for (const node of nodes.values()) {
    if (node.parent && node.parent !== node.id) {
      const key = [node.id, node.parent].sort().join("-");
      treeEdges.add(key);
    }
  }

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (canvas.width !== WIDTH * dpr || canvas.height !== HEIGHT * dpr) {
      canvas.width = WIDTH * dpr;
      canvas.height = HEIGHT * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw links
    for (const link of links) {
      const a = nodes.get(link.a);
      const b = nodes.get(link.b);
      if (!a || !b) continue;
      const key = [link.a, link.b].sort().join("-");
      const isTree = treeEdges.has(key);
      const isRoute =
        routePath.length > 0 &&
        routePath.some((id, i) => {
          const next = routePath[i + 1];
          if (!next) return false;
          return (id === link.a && next === link.b) || (id === link.b && next === link.a);
        });

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (isRoute) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else if (isTree) {
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = "#1e2a3a";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw nodes
    for (const node of nodes.values()) {
      const isRoot = node.id === rootId;
      const isSelected = node.id === selectedNode;
      const inRoute = routePath.includes(node.id);

      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

      if (isRoot) {
        ctx.fillStyle = "#0e7490";
      } else if (inRoute) {
        ctx.fillStyle = "#92400e";
      } else if (isSelected) {
        ctx.fillStyle = "#1e2a3a";
      } else {
        ctx.fillStyle = "#131929";
      }
      ctx.fill();

      ctx.strokeStyle = isRoot
        ? "#22d3ee"
        : isSelected
          ? "#60a5fa"
          : inRoute
            ? "#f59e0b"
            : "#2d3a4f";
      ctx.lineWidth = isRoot || isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.id, node.x, node.y);

      // Coords display
      if (showCoords && node.coords.length > 0) {
        ctx.font = "9px monospace";
        ctx.fillStyle = "#8896ab";
        const coordStr = node.coords.map((c) => shortAddr(c)).join(" → ");
        ctx.fillText(coordStr, node.x, node.y + NODE_RADIUS + 12);
      }
    }
  }, [nodes, links, selectedNode, routePath, showCoords, rootId, treeEdges]);

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (HEIGHT / rect.height);

    for (const node of nodes.values()) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < NODE_RADIUS * NODE_RADIUS) {
        if (routeFrom) {
          const path: string[] = [routeFrom];
          let current = routeFrom;
          for (let hop = 0; hop < 20; hop++) {
            const next = findNextHop(current, node.id, nodes);
            if (!next || next === current) break;
            path.push(next);
            if (next === node.id) break;
            current = next;
          }
          setRoutePath(path);
          setRouteFrom(null);
        } else {
          setSelectedNode(node.id);
          setDragging(node.id);
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        return;
      }
    }
    setSelectedNode(null);
    setRoutePath([]);
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(
      NODE_RADIUS,
      Math.min(WIDTH - NODE_RADIUS, (e.clientX - rect.left) * (WIDTH / rect.width))
    );
    const y = Math.max(
      NODE_RADIUS,
      Math.min(HEIGHT - NODE_RADIUS, (e.clientY - rect.top) * (HEIGHT / rect.height))
    );

    setNodes((prev) => {
      const copy = new Map(prev);
      const node = copy.get(dragging);
      if (node) copy.set(dragging, { ...node, x, y });
      return copy;
    });
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragging && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(null);
  }

  function killRandomLink() {
    if (links.length <= nodes.size - 1) return;
    const nonTree = links.filter((l) => {
      const key = [l.a, l.b].sort().join("-");
      return !treeEdges.has(key);
    });
    const target = nonTree.length > 0 ? nonTree : links;
    const idx = Math.floor(Math.random() * target.length);
    const newLinks = links.filter((l) => l !== target[idx]);
    setLinks(newLinks);
    setNodes(rebuild(nodes, newLinks));
    setRoutePath([]);
  }

  function reset() {
    const n = createDemoNodes(10, WIDTH, HEIGHT);
    const l = createDemoLinks(n);
    setNodes(rebuild(n, l));
    setLinks(l);
    setSelectedNode(null);
    setRouteFrom(null);
    setRoutePath([]);
  }

  const selectedInfo = selectedNode ? nodes.get(selectedNode) : null;

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Mesh Simulator</h3>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setShowCoords(!showCoords)}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
          >
            {showCoords ? "Hide" : "Show"} Coords
          </button>
          <button
            onClick={() => {
              setRouteFrom(selectedNode);
              setRoutePath([]);
            }}
            disabled={!selectedNode}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors disabled:opacity-30"
          >
            Route From {selectedNode || "..."}
          </button>
          <button
            onClick={killRandomLink}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-red/40 text-fips-red transition-colors"
          >
            Kill Link
          </button>
          <button
            onClick={reset}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {routeFrom && (
        <p className="text-fips-highlight text-xs mb-2 font-mono">
          Click a destination node to show the route from {routeFrom}.
        </p>
      )}

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Interactive mesh network diagram. Drag nodes to reposition them; tap a node to select it; use the buttons above to pick a route or remove a link."
        className="w-full rounded border border-fips-border bg-fips-bg cursor-crosshair touch-none select-none"
        style={{ maxWidth: WIDTH }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      />

      <div className="mt-3 flex gap-4 text-xs text-fips-muted">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-fips-accent inline-block" /> tree edge
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-fips-border inline-block border-t border-dashed border-fips-muted" />{" "}
          mesh edge
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-fips-highlight inline-block" /> route
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-fips-accent-dim inline-block border border-fips-accent" />{" "}
          root
        </span>
      </div>

      {selectedInfo && (
        <div className="mt-3 rounded border border-fips-border p-3 text-sm font-mono">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-fips-muted">Node:</span>
            <span>{selectedInfo.id}</span>
            <span className="text-fips-muted">node_addr:</span>
            <span>{shortAddr(selectedInfo.nodeAddr)}</span>
            <span className="text-fips-muted">Parent:</span>
            <span>{selectedInfo.parent === selectedInfo.id ? "(root)" : selectedInfo.parent}</span>
            <span className="text-fips-muted">Depth:</span>
            <span>{selectedInfo.coords.length > 0 ? selectedInfo.coords.length - 1 : "?"}</span>
            <span className="text-fips-muted">Peers:</span>
            <span>{Array.from(selectedInfo.peers).join(", ")}</span>
            <span className="text-fips-muted">Coords:</span>
            <span className="break-all">
              {selectedInfo.coords.map((c) => shortAddr(c)).join(" → ")}
            </span>
          </div>
        </div>
      )}

      {routePath.length > 1 && (
        <div className="mt-2 text-xs font-mono text-fips-highlight">
          Route: {routePath.join(" → ")} ({routePath.length - 1} hop
          {routePath.length - 1 !== 1 ? "s" : ""})
        </div>
      )}
    </div>
  );
}
