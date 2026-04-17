export interface GlossaryTerm {
  /** URL-safe id; use in anchor links as `/glossary#<id>`. */
  id: string;
  /** Display term. */
  term: string;
  /** Optional short label or initialism expansion shown next to the term. */
  expansion?: string;
  /** One-sentence summary used as the short definition. */
  summary: string;
  /** Longer paragraph-level description. */
  detail: string;
  /** Related lesson numbers for cross-linking. */
  lessons?: number[];
  /** Tags for grouping / filtering. */
  tags?: string[];
}

export const glossary: GlossaryTerm[] = [
  {
    id: "fips",
    term: "FIPS",
    expansion: "Free Internetworking Peering System",
    summary: "A self-organizing, encrypted mesh protocol that runs over any datagram transport.",
    detail:
      "FIPS replaces the traditional internet's stack of centralized services (ISPs, DNS, CAs) with a peer-to-peer mesh. Nodes authenticate using Nostr keypairs, route cooperatively via spanning-tree coordinates, and encrypt every packet in two independent Noise layers.",
    lessons: [1],
    tags: ["protocol"],
  },
  {
    id: "fmp",
    term: "FMP",
    expansion: "FIPS Mesh Protocol",
    summary: "The hop-by-hop link layer: authentication, link encryption (Noise IK), and routing.",
    detail:
      "FMP runs between directly connected peers. It carries the routing envelope (source/destination node_addrs, TTL, path MTU) in a form that transit nodes can read, and re-encrypts every packet for the next link under a fresh Noise IK session.",
    lessons: [3, 5, 6],
    tags: ["layer", "encryption"],
  },
  {
    id: "fsp",
    term: "FSP",
    expansion: "FIPS Session Protocol",
    summary:
      "The end-to-end session layer: Noise XK encryption between the original sender and final recipient.",
    detail:
      "FSP survives all intermediate link encryptions and re-encryptions intact. Transit routers can see the FMP routing envelope but cannot read the FSP payload. Noise XK hides the initiator's static key until the third handshake message.",
    lessons: [3, 6, 7],
    tags: ["layer", "encryption"],
  },
  {
    id: "mmp",
    term: "MMP",
    expansion: "FIPS Metrics / Measurement Protocol",
    summary: "Background measurement of link quality and path cost.",
    detail:
      "MMP exchanges latency, loss, and throughput samples between peers. Its results feed into spanning-tree cost comparisons and routing decisions without affecting the critical data path.",
    lessons: [5, 7],
    tags: ["layer"],
  },
  {
    id: "node_addr",
    term: "node_addr",
    summary:
      "128-bit routing identifier derived from SHA-256 of the x-only public key, truncated to 16 bytes.",
    detail:
      "node_addr is what transit routers see in the routing envelope. It is a one-way hash of the node's public key — routers cannot recover the npub from it. It is also the input to the node's IPv6 ULA address.",
    lessons: [2, 5],
    tags: ["identity", "routing"],
  },
  {
    id: "npub",
    term: "npub",
    expansion: "Nostr public key, bech32-encoded",
    summary: "The application-layer identity users share with each other.",
    detail:
      "An npub is the bech32 encoding of an x-only secp256k1 public key (the same format Nostr uses). Two people with each other's npubs can open an FSP session directly; transit nodes never learn the endpoints' npubs.",
    lessons: [2, 6],
    tags: ["identity"],
  },
  {
    id: "coordinate",
    term: "Tree coordinate",
    summary:
      "A node's path from itself to the root of the spanning tree, used as its routable address in the mesh.",
    detail:
      "Each node's coordinate is an ordered list of node_addrs: [self, parent, grandparent, …, root]. Greedy routing forwards a packet to the peer whose coordinate has the smallest tree distance (longest common suffix) to the destination's coordinate.",
    lessons: [5, 7],
    tags: ["routing"],
  },
  {
    id: "spanning-tree",
    term: "Spanning tree",
    summary:
      "The shared rooted tree the mesh builds over its physical links, used to assign coordinates.",
    detail:
      "Each node independently picks the smallest node_addr it has heard as the root, and the cheapest neighbor toward that root as its parent. No election protocol runs — the rules converge on the globally-smallest root as gossip propagates.",
    lessons: [5, 7],
    tags: ["routing"],
  },
  {
    id: "bloom-filter",
    term: "Bloom filter",
    summary:
      "A compact probabilistic set membership structure peers exchange to advertise reachability.",
    detail:
      "When a peer's filter says 'no', the destination is definitely not reachable through them (no false negatives). When it says 'yes', the destination probably is (small, tunable false-positive rate). Bloom filters bound routing state per peer regardless of mesh size.",
    lessons: [5],
    tags: ["routing", "data-structure"],
  },
  {
    id: "noise-ik",
    term: "Noise IK",
    summary:
      "The Noise pattern used for FMP link handshakes: single round-trip mutual authentication.",
    detail:
      "IK means the Initiator already Knows the responder's static key from configuration. The initiator transmits their static key in message one, encrypted under a shared key derived from ephemeral keys. Fast, which matters for link setup.",
    lessons: [6],
    tags: ["encryption"],
  },
  {
    id: "noise-xk",
    term: "Noise XK",
    summary:
      "The Noise pattern used for FSP session handshakes: initiator identity is hidden until the third message.",
    detail:
      "XK delays transmitting the initiator's static key until message three, where it is encrypted under the full shared secret. Transit routers cannot correlate the initiator's identity from an observed handshake, which matters because session traffic traverses untrusted intermediate nodes.",
    lessons: [6],
    tags: ["encryption"],
  },
  {
    id: "ipv6-ula",
    term: "IPv6 ULA (fd00::/8)",
    summary:
      "Unique Local Address range used for FIPS IPv6 addresses so legacy apps can address mesh peers.",
    detail:
      "FIPS derives a per-node IPv6 address by prepending 0xfd to the first 15 bytes of the node_addr. The result sits in fd00::/8, which never collides with public IPv6 routing, and lets unmodified IPv6 software speak into the mesh via a TUN adapter.",
    lessons: [2, 7],
    tags: ["identity", "compatibility"],
  },
  {
    id: "transport",
    term: "Transport",
    summary: "Any medium that can move datagrams: WiFi, Ethernet, UDP overlay, Tor, serial link.",
    detail:
      "FIPS treats transports as pluggable drivers. A node can run multiple transports at once, bridging peers on different media into the same mesh. The protocol above is unchanged — only the framing and peer discovery differ per transport.",
    lessons: [4, 7],
    tags: ["architecture"],
  },
];

export function getTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((t) => t.id === id);
}
