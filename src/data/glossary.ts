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
      "MMP runs per peer link in three modes (full, lightweight, minimal). It tracks SRTT, loss, jitter, goodput, OWD trend, and ETX, emits periodic SenderReports and ReceiverReports, and exposes a single link_cost that the spanning tree uses for parent selection.",
    lessons: [5, 7, 10],
    tags: ["layer"],
  },
  {
    id: "etx",
    term: "ETX",
    expansion: "Expected Transmission Count",
    summary: "1 / (forward_ratio × reverse_ratio). A clean link has ETX near 1.",
    detail:
      "MMP derives ETX from bidirectional delivery ratios observed over the reporting interval. It is the loss half of link cost: a link with 20% loss in each direction has ETX near 1.56, meaning the mesh effectively has to transmit roughly 1.56 times per successful delivery.",
    lessons: [10],
    tags: ["routing", "layer"],
  },
  {
    id: "link-cost",
    term: "link_cost",
    summary: "ETX × (1 + SRTT_ms / 100). The scalar the spanning tree minimizes.",
    detail:
      "Every peer link has a link_cost that combines loss (via ETX) and latency (via SRTT). A node's effective_depth through a candidate parent is peer.depth + link_cost. Parent switches require the new candidate to beat the current parent by at least parent_hysteresis (default 20%).",
    lessons: [10],
    tags: ["routing"],
  },
  {
    id: "spin-bit",
    term: "Spin bit",
    summary: "A single-bit field in the FMP header used for RTT estimation by transit observers.",
    detail:
      "The TX side reflects the spin bit back per the QUIC state machine so an on-path observer can derive RTT without decryption. FIPS implements the reflection, but its own RTT samples come only from MMP timestamp-echo: inter-frame processing delays make the spin-bit RTT too noisy to use directly.",
    lessons: [10],
    tags: ["layer"],
  },
  {
    id: "ecn",
    term: "ECN / CE flag",
    expansion: "Explicit Congestion Notification",
    summary:
      "A flag bit transit nodes set when they see loss, high ETX, or kernel buffer drops ahead.",
    detail:
      "CE is sticky: once set along a path, every downstream hop leaves it set. At the IPv6 adapter, CE-marked FSP packets get CE written into the Traffic Class ECN bits (only if the inner packet was ECT-capable), so guest TCP stacks cut their window without the mesh ever parsing TCP.",
    lessons: [10],
    tags: ["layer", "routing"],
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
      "FIPS treats transports as pluggable drivers. A node can run multiple transports at once, bridging peers on different media into the same mesh. The protocol above is unchanged: only the framing and peer discovery differ per transport.",
    lessons: [4, 7],
    tags: ["architecture"],
  },
  {
    id: "coordinate-cache",
    term: "Coordinate cache",
    summary: "Per-node lookup table mapping node_addr to current tree coordinates.",
    detail:
      "Every node keeps a bounded cache of coordinates for destinations it has forwarded toward. Entries are seeded by SessionSetup, refreshed by CP-flagged data packets and CoordsWarmup messages, and expire by TTL. Without a cache entry for the destination, find_next_hop() returns None before bloom filters are even consulted.",
    lessons: [5, 7, 8],
    tags: ["routing"],
  },
  {
    id: "cp-flag",
    term: "CP flag",
    expansion: "Coordinates Piggyback",
    summary:
      "An FSP header bit telling transit nodes the packet carries cleartext src and dst coordinates for caching.",
    detail:
      "The first five data packets of a session, plus any packet sent after CoordsRequired or PathBroken, set the CP flag and include coordinates between the FSP header and the AEAD ciphertext. Transit nodes parse them without decrypting the payload. The same format is used by the standalone CoordsWarmup (0x14) message.",
    lessons: [8],
    tags: ["routing", "session"],
  },
  {
    id: "error-signals",
    term: "Error signals",
    summary:
      "CoordsRequired, PathBroken, and MtuExceeded: explicit feedback from transit nodes to the source.",
    detail:
      "When a transit node cannot forward a SessionDatagram, it builds a new SessionDatagram back to the source with one of three payloads: CoordsRequired (0x15) if it has no cached coordinates for the destination, PathBroken (0x16) if its cached coordinates put it at a local minimum, MtuExceeded (0x17) if the packet is too large for the next-hop link. Rate-limited to one per destination per 100ms at the transit node.",
    lessons: [8],
    tags: ["routing", "recovery"],
  },
  {
    id: "mtu",
    term: "Path MTU",
    summary: "Largest SessionDatagram size the current path can carry without fragmentation.",
    detail:
      "SessionDatagram and LookupResponse both carry a path_mtu field that tracks the minimum link MTU seen along the forward path. The mesh layer never fragments. If a packet still exceeds the next-hop MTU at some transit node, that node emits MtuExceeded and FSP clamps its estimate accordingly.",
    lessons: [8],
    tags: ["routing"],
  },
];

export function getTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((t) => t.id === id);
}
