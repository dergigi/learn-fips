import type { MeshNode, Link, NodeAddr } from "./types";
import { sha256 } from "@noble/hashes/sha2.js";

/** Compare two NodeAddrs lexicographically. Returns <0, 0, or >0. */
export function compareNodeAddr(a: NodeAddr, b: NodeAddr): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return a.length - b.length;
}

function nodeAddrEqual(a: NodeAddr, b: NodeAddr): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** The labels used by demo widgets (mesh simulator, bloom filter, ...). */
export const DEMO_NODE_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

/** Generate a deterministic NodeAddr from a simple string ID (for simulation). */
export function nodeAddrFromId(id: string): NodeAddr {
  const encoded = new TextEncoder().encode(id);
  return sha256(encoded).slice(0, 16);
}

/** Compute a node's tree coordinate: [self, parent, ..., root] */
export function computeCoordinate(nodeId: string, nodes: Map<string, MeshNode>): NodeAddr[] {
  const coords: NodeAddr[] = [];
  let current = nodeId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const node = nodes.get(current);
    if (!node) break;
    coords.push(node.nodeAddr);
    if (node.parent === null || node.parent === current) break;
    current = node.parent;
  }
  return coords;
}

/**
 * Tree distance between two nodes using their coordinates.
 * Distance = hops from each to their lowest common ancestor.
 */
export function treeDistance(coordsA: NodeAddr[], coordsB: NodeAddr[]): number {
  // Find longest common suffix
  let commonLen = 0;
  let ia = coordsA.length - 1;
  let ib = coordsB.length - 1;
  while (ia >= 0 && ib >= 0 && nodeAddrEqual(coordsA[ia]!, coordsB[ib]!)) {
    commonLen++;
    ia--;
    ib--;
  }
  if (commonLen === 0) return Infinity; // different trees
  return coordsA.length - commonLen + (coordsB.length - commonLen);
}

/**
 * Build a spanning tree over the given nodes and links.
 * Root = node with lexicographically smallest nodeAddr.
 * Uses BFS from root to assign parents (simple, not cost-weighted).
 */
export function buildSpanningTree(nodes: Map<string, MeshNode>, links: Link[]): void {
  // Build adjacency from links, restricted to existing peers
  const adj = new Map<string, Set<string>>();
  for (const node of nodes.values()) {
    adj.set(node.id, new Set());
  }
  for (const link of links) {
    adj.get(link.a)?.add(link.b);
    adj.get(link.b)?.add(link.a);
  }

  // Sync peer sets
  for (const node of nodes.values()) {
    node.peers = adj.get(node.id) ?? new Set();
  }

  // Find root: smallest nodeAddr
  let root: MeshNode | null = null;
  for (const node of nodes.values()) {
    if (!root || compareNodeAddr(node.nodeAddr, root.nodeAddr) < 0) {
      root = node;
    }
  }
  if (!root) return;

  // Reset all parents
  for (const node of nodes.values()) {
    node.parent = null;
    node.coords = [];
  }

  // BFS from root
  root.parent = root.id; // root is its own parent
  const queue: string[] = [root.id];
  const visited = new Set<string>([root.id]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = nodes.get(currentId)!;

    for (const peerId of current.peers) {
      if (!visited.has(peerId)) {
        visited.add(peerId);
        const peer = nodes.get(peerId)!;
        peer.parent = currentId;
        queue.push(peerId);
      }
    }
  }

  // Compute coordinates for all connected nodes
  for (const node of nodes.values()) {
    if (visited.has(node.id)) {
      node.coords = computeCoordinate(node.id, nodes);
    }
  }
}

/**
 * Find next hop for a packet at `currentId` destined for `destId`.
 * Returns the peer id to forward to, or null if no route.
 * Implements the simplified priority chain:
 * 1. Local delivery
 * 2. Direct peer
 * 3. Greedy tree routing (closest peer by tree distance)
 */
export function findNextHop(
  currentId: string,
  destId: string,
  nodes: Map<string, MeshNode>
): string | null {
  if (currentId === destId) return currentId; // local delivery

  const current = nodes.get(currentId);
  const dest = nodes.get(destId);
  if (!current || !dest || dest.coords.length === 0) return null;

  // Direct peer?
  if (current.peers.has(destId)) return destId;

  // Greedy: forward to peer that minimizes tree distance to dest
  const myDist = treeDistance(current.coords, dest.coords);
  let bestPeer: string | null = null;
  let bestDist = myDist;

  for (const peerId of current.peers) {
    const peer = nodes.get(peerId);
    if (!peer || peer.coords.length === 0) continue;
    const d = treeDistance(peer.coords, dest.coords);
    if (d < bestDist) {
      bestDist = d;
      bestPeer = peerId;
    }
  }

  return bestPeer;
}

/** Create a set of demo nodes with random positions. */
export function createDemoNodes(
  count: number,
  width: number,
  height: number
): Map<string, MeshNode> {
  const nodes = new Map<string, MeshNode>();
  const padding = 60;
  for (let i = 0; i < Math.min(count, DEMO_NODE_LABELS.length); i++) {
    const id = DEMO_NODE_LABELS[i]!;
    nodes.set(id, {
      id,
      nodeAddr: nodeAddrFromId(id),
      publicKey: new Uint8Array(33),
      coords: [],
      parent: null,
      peers: new Set(),
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
    });
  }
  return nodes;
}

/** Generate links for a connected random mesh. */
export function createDemoLinks(nodes: Map<string, MeshNode>, extraLinkChance = 0.15): Link[] {
  const ids = Array.from(nodes.keys());
  const links: Link[] = [];

  // First, build a random spanning tree to guarantee connectivity
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  for (let i = 1; i < shuffled.length; i++) {
    const connectTo = shuffled[Math.floor(Math.random() * i)]!;
    links.push({ a: shuffled[i]!, b: connectTo });
  }

  // Add extra mesh links
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 2; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const exists = links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
      if (!exists && Math.random() < extraLinkChance) {
        links.push({ a, b });
      }
    }
  }

  return links;
}
