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
const TIDY_PADDING = 44;

function shortAddr(addr: Uint8Array): string {
  return hexEncode(addr).slice(0, 6);
}

const NUDGE_STEP = 20;

/**
 * Place every node on a level curve keyed by its depth in the spanning
 * tree, with siblings spread horizontally in proportion to the width of
 * their own subtrees. This is a stripped-down Reingold-Tilford: it is
 * stable, handles any branching factor, and never overlaps siblings.
 * Nodes disconnected from the root land on a reserve row at the bottom.
 */
function tidyTreeLayout(nodes: Map<string, MeshNode>, rootId: string): Map<string, MeshNode> {
  const children = new Map<string, string[]>();
  for (const n of nodes.values()) {
    if (n.parent && n.parent !== n.id) {
      const arr = children.get(n.parent) ?? [];
      arr.push(n.id);
      children.set(n.parent, arr);
    }
  }
  for (const arr of children.values()) arr.sort();

  const subtreeWidth = new Map<string, number>();
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  function computeShape(id: string, d: number): number {
    if (visiting.has(id)) return 1;
    visiting.add(id);
    depth.set(id, d);
    const kids = children.get(id) ?? [];
    let w = 0;
    for (const k of kids) w += computeShape(k, d + 1);
    const width = Math.max(1, w);
    subtreeWidth.set(id, width);
    return width;
  }
  computeShape(rootId, 0);

  const positions = new Map<string, { x: number; y: number }>();
  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const innerH = HEIGHT - 2 * TIDY_PADDING;
  const yStep = maxDepth > 0 ? innerH / maxDepth : 0;

  function place(id: string, xStart: number, xEnd: number) {
    const d = depth.get(id) ?? 0;
    const y = TIDY_PADDING + d * yStep;
    const kids = children.get(id) ?? [];
    const totalKidWidth = kids.reduce((s, k) => s + (subtreeWidth.get(k) ?? 1), 0);
    let cursor = xStart;
    for (const k of kids) {
      const w = subtreeWidth.get(k) ?? 1;
      const portion = totalKidWidth > 0 ? (xEnd - xStart) * (w / totalKidWidth) : 0;
      place(k, cursor, cursor + portion);
      cursor += portion;
    }
    if (kids.length > 0) {
      const first = positions.get(kids[0]!)!;
      const last = positions.get(kids[kids.length - 1]!)!;
      positions.set(id, { x: (first.x + last.x) / 2, y });
    } else {
      positions.set(id, { x: (xStart + xEnd) / 2, y });
    }
  }
  place(rootId, TIDY_PADDING, WIDTH - TIDY_PADDING);

  const unassigned = Array.from(nodes.keys()).filter((id) => !positions.has(id));
  if (unassigned.length > 0) {
    const y = HEIGHT - TIDY_PADDING / 2;
    const span = WIDTH - 2 * TIDY_PADDING;
    unassigned.forEach((id, i) => {
      const x = TIDY_PADDING + ((i + 0.5) * span) / unassigned.length;
      positions.set(id, { x, y });
    });
  }

  const out = new Map<string, MeshNode>();
  for (const [id, n] of nodes.entries()) {
    const p = positions.get(id);
    if (!p) {
      out.set(id, { ...n, peers: new Set(n.peers) });
      continue;
    }
    const clampedX = Math.max(NODE_RADIUS, Math.min(WIDTH - NODE_RADIUS, p.x));
    const clampedY = Math.max(NODE_RADIUS, Math.min(HEIGHT - NODE_RADIUS, p.y));
    out.set(id, { ...n, x: clampedX, y: clampedY, peers: new Set(n.peers) });
  }
  return out;
}

function computeRoute(from: string, to: string, nodes: Map<string, MeshNode>): string[] {
  const path: string[] = [from];
  let current = from;
  for (let hop = 0; hop < 20; hop++) {
    const next = findNextHop(current, to, nodes);
    if (!next || next === current) break;
    path.push(next);
    if (next === to) break;
    current = next;
  }
  return path;
}

export default function MeshSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Map<string, MeshNode>>(() =>
    createDemoNodes(10, WIDTH, HEIGHT)
  );
  const [links, setLinks] = useState<Link[]>(() => createDemoLinks(nodes));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [routeFrom, setRouteFrom] = useState<string | null>(null);
  const [routeTo, setRouteTo] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

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
        ctx.strokeStyle = "rgba(52, 211, 153, 0.55)";
        ctx.lineWidth = 1.25;
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
          const path = computeRoute(routeFrom, node.id, nodes);
          setRouteTo(node.id);
          setRoutePath(path);
          setRouteFrom(null);
          setStatusMsg(
            `Route ${routeFrom} to ${node.id}: ${path.join(" → ")} (${path.length - 1} hops).`
          );
        } else {
          setSelectedNode(node.id);
          setStatusMsg(`Selected node ${node.id}. Use arrow keys to move it.`);
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

  function tidyLayout() {
    if (!rootId) return;
    const laid = tidyTreeLayout(nodes, rootId);
    setNodes(rebuild(laid, links));
    setStatusMsg("Mesh arranged as a tree rooted at " + rootId + ".");
  }

  function reset() {
    const n = createDemoNodes(10, WIDTH, HEIGHT);
    const l = createDemoLinks(n);
    setNodes(rebuild(n, l));
    setLinks(l);
    setSelectedNode(null);
    setRouteFrom(null);
    setRouteTo(null);
    setRoutePath([]);
    setStatusMsg("Mesh reset.");
  }

  function nudgeSelected(dx: number, dy: number) {
    if (!selectedNode) return;
    setNodes((prev) => {
      const copy = new Map(prev);
      const n = copy.get(selectedNode);
      if (!n) return prev;
      const x = Math.max(NODE_RADIUS, Math.min(WIDTH - NODE_RADIUS, n.x + dx));
      const y = Math.max(NODE_RADIUS, Math.min(HEIGHT - NODE_RADIUS, n.y + dy));
      copy.set(selectedNode, { ...n, x, y });
      return copy;
    });
  }

  function handleCanvasKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!selectedNode) return;
    const step = e.shiftKey ? NUDGE_STEP * 2 : NUDGE_STEP;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        nudgeSelected(0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        nudgeSelected(0, step);
        break;
      case "ArrowLeft":
        e.preventDefault();
        nudgeSelected(-step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        nudgeSelected(step, 0);
        break;
      case "Escape":
        setSelectedNode(null);
        setStatusMsg("Selection cleared.");
        break;
      default:
    }
  }

  function showRouteFromForm() {
    if (!routeFrom || !routeTo) return;
    const path = computeRoute(routeFrom, routeTo, nodes);
    setRoutePath(path);
    setStatusMsg(
      path.length > 1
        ? `Route ${routeFrom} to ${routeTo}: ${path.join(" → ")} (${path.length - 1} hops).`
        : `No route found from ${routeFrom} to ${routeTo}.`
    );
  }

  const selectedInfo = selectedNode ? nodes.get(selectedNode) : null;
  const sortedIds = Array.from(nodes.keys()).sort();

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Mesh Simulator</h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowCoords(!showCoords)}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
          >
            {showCoords ? "Hide" : "Show"} Coords
          </button>
          <button
            type="button"
            onClick={tidyLayout}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
            title="Arrange nodes as a top-down tree rooted at the lowest node_addr"
          >
            Tidy
          </button>
          <button
            type="button"
            onClick={killRandomLink}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-red/40 text-fips-red transition-colors"
          >
            Kill Link
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-2 py-1 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className="mb-3 rounded border border-fips-border bg-fips-bg/40 p-3 flex flex-wrap items-end gap-3 text-xs"
        role="group"
        aria-label="Keyboard-accessible mesh controls"
      >
        <label className="flex flex-col gap-1">
          <span className="text-fips-muted font-mono uppercase tracking-wide">Selected</span>
          <select
            value={selectedNode ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setSelectedNode(v);
              if (v) setStatusMsg(`Selected node ${v}. Use arrow keys to move it.`);
            }}
            className="bg-fips-surface border border-fips-border rounded px-2 py-1 font-mono"
          >
            <option value="">(none)</option>
            {sortedIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fips-muted font-mono uppercase tracking-wide">Route from</span>
          <select
            value={routeFrom ?? ""}
            onChange={(e) => setRouteFrom(e.target.value || null)}
            className="bg-fips-surface border border-fips-border rounded px-2 py-1 font-mono"
          >
            <option value="">(choose)</option>
            {sortedIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fips-muted font-mono uppercase tracking-wide">Route to</span>
          <select
            value={routeTo ?? ""}
            onChange={(e) => setRouteTo(e.target.value || null)}
            className="bg-fips-surface border border-fips-border rounded px-2 py-1 font-mono"
          >
            <option value="">(choose)</option>
            {sortedIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={showRouteFromForm}
          disabled={!routeFrom || !routeTo}
          className="px-3 py-1.5 rounded border border-fips-border hover:border-fips-accent/40 transition-colors disabled:opacity-30"
        >
          Show route
        </button>
        <button
          type="button"
          onClick={() => {
            setRouteFrom(null);
            setRouteTo(null);
            setRoutePath([]);
            setStatusMsg("Route cleared.");
          }}
          className="px-3 py-1.5 rounded border border-fips-border hover:border-fips-accent/40 transition-colors"
        >
          Clear
        </button>
      </div>

      <p className="text-fips-muted text-xs mb-2">
        Tip: click a node to select it, then use arrow keys to nudge it (Shift = larger steps, Esc
        to deselect). Screen reader users can pick a source and destination above and press{" "}
        <kbd className="font-mono">Show route</kbd>.
      </p>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label="Interactive mesh network diagram. Drag nodes to reposition them; tap a node to select it; arrow keys nudge the selected node."
        className="w-full rounded border border-fips-border bg-fips-bg cursor-crosshair touch-none select-none focus:outline-none focus:ring-2 focus:ring-fips-accent"
        style={{ maxWidth: WIDTH }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onKeyDown={handleCanvasKeyDown}
      />

      <div aria-live="polite" className="sr-only">
        {statusMsg}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-fips-muted">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-fips-accent inline-block" /> tree edge
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0 inline-block border-t border-dashed border-fips-green/70" /> mesh
          edge
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
