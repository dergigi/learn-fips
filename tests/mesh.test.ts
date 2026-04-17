import { describe, it, expect } from "vitest";
import {
  buildSpanningTree,
  compareNodeAddr,
  createDemoLinks,
  createDemoNodes,
  findNextHop,
  nodeAddrFromId,
  treeDistance,
} from "../src/lib/mesh";
import type { Link, MeshNode } from "../src/lib/types";

function makeNode(id: string, x = 0, y = 0): MeshNode {
  return {
    id,
    nodeAddr: nodeAddrFromId(id),
    publicKey: new Uint8Array(33),
    coords: [],
    parent: null,
    peers: new Set(),
    x,
    y,
  };
}

function makeMesh(ids: string[], links: Link[]) {
  const nodes = new Map<string, MeshNode>();
  for (const id of ids) nodes.set(id, makeNode(id));
  buildSpanningTree(nodes, links);
  return nodes;
}

describe("compareNodeAddr", () => {
  it("orders by first differing byte", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 4]);
    expect(compareNodeAddr(a, b)).toBeLessThan(0);
    expect(compareNodeAddr(b, a)).toBeGreaterThan(0);
    expect(compareNodeAddr(a, a)).toBe(0);
  });
});

describe("buildSpanningTree", () => {
  it("picks the smallest node_addr as the root", () => {
    const ids = ["A", "B", "C", "D", "E"];
    const links: Link[] = [
      { a: "A", b: "B" },
      { a: "B", b: "C" },
      { a: "C", b: "D" },
      { a: "D", b: "E" },
    ];
    const nodes = makeMesh(ids, links);
    const root = [...nodes.values()].reduce((best, n) =>
      compareNodeAddr(n.nodeAddr, best.nodeAddr) < 0 ? n : best
    );
    expect(root.parent).toBe(root.id);
  });

  it("assigns every connected node a non-empty coordinate", () => {
    const ids = ["A", "B", "C", "D"];
    const nodes = makeMesh(ids, [
      { a: "A", b: "B" },
      { a: "B", b: "C" },
      { a: "C", b: "D" },
    ]);
    for (const n of nodes.values()) {
      expect(n.coords.length).toBeGreaterThan(0);
    }
  });

  it("assigns no coordinate to disconnected nodes", () => {
    const ids = ["A", "B", "C"];
    // C has no peer
    const nodes = makeMesh(ids, [{ a: "A", b: "B" }]);
    expect(nodes.get("C")?.coords.length).toBe(0);
  });
});

describe("treeDistance", () => {
  it("is 0 between a node and itself", () => {
    const nodes = makeMesh(["A", "B"], [{ a: "A", b: "B" }]);
    const a = nodes.get("A")!;
    expect(treeDistance(a.coords, a.coords)).toBe(0);
  });

  it("equals hop count on a linear chain", () => {
    const ids = ["A", "B", "C", "D"];
    const nodes = makeMesh(ids, [
      { a: "A", b: "B" },
      { a: "B", b: "C" },
      { a: "C", b: "D" },
    ]);
    const first = ids.reduce((best, id) =>
      compareNodeAddr(nodes.get(id)!.nodeAddr, nodes.get(best)!.nodeAddr) < 0 ? id : best
    );
    const last = ids.reduce((best, id) =>
      compareNodeAddr(nodes.get(id)!.nodeAddr, nodes.get(best)!.nodeAddr) > 0 ? id : best
    );
    const d = treeDistance(nodes.get(first)!.coords, nodes.get(last)!.coords);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(ids.length - 1);
  });
});

describe("findNextHop", () => {
  it("returns the destination when it is a direct peer", () => {
    const nodes = makeMesh(["A", "B"], [{ a: "A", b: "B" }]);
    expect(findNextHop("A", "B", nodes)).toBe("B");
  });

  it("returns the same id for local delivery", () => {
    const nodes = makeMesh(["A", "B"], [{ a: "A", b: "B" }]);
    expect(findNextHop("A", "A", nodes)).toBe("A");
  });

  it("eventually reaches the destination via greedy routing", () => {
    const ids = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const links: Link[] = [];
    // Build a chain plus a few shortcuts
    for (let i = 1; i < ids.length; i++) links.push({ a: ids[i - 1], b: ids[i] });
    links.push({ a: "B", b: "E" });
    links.push({ a: "D", b: "G" });
    const nodes = makeMesh(ids, links);

    for (const src of ids) {
      for (const dst of ids) {
        if (src === dst) continue;
        const path: string[] = [src];
        let current = src;
        let hops = 0;
        while (current !== dst && hops < 30) {
          const next = findNextHop(current, dst, nodes);
          expect(next).not.toBeNull();
          if (!next || next === current) break;
          path.push(next);
          current = next;
          hops++;
        }
        expect(current).toBe(dst);
      }
    }
  });
});

describe("createDemoNodes + createDemoLinks", () => {
  it("produces a connected graph", () => {
    const nodes = createDemoNodes(12, 400, 400);
    const links = createDemoLinks(nodes, 0);
    const adj = new Map<string, Set<string>>();
    for (const id of nodes.keys()) adj.set(id, new Set());
    for (const l of links) {
      adj.get(l.a)!.add(l.b);
      adj.get(l.b)!.add(l.a);
    }
    // BFS from the first node reaches everybody.
    const start = [...nodes.keys()][0];
    const visited = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const peer of adj.get(cur)!) {
        if (!visited.has(peer)) {
          visited.add(peer);
          queue.push(peer);
        }
      }
    }
    expect(visited.size).toBe(nodes.size);
  });
});
