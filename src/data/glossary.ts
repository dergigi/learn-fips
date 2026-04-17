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
  /**
   * Literal strings that, when found in lesson prose, should be auto-decorated
   * with a glossary tooltip + link. Case-sensitive, whole-word match. Longer
   * strings win when they overlap (e.g. "Noise IK" before "IK").
   */
  acronyms?: string[];
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
    acronyms: ["FMP"],
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
    acronyms: ["FSP"],
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
    acronyms: ["MMP"],
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
    acronyms: ["ETX"],
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
    acronyms: ["ECN"],
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
    acronyms: ["Noise IK", "IK"],
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
    acronyms: ["Noise XK", "XK"],
  },
  {
    id: "secp256k1",
    term: "secp256k1",
    summary: "The elliptic curve used for FIPS identity keys, the same one Bitcoin and Nostr use.",
    detail:
      "A FIPS node's identity is a secp256k1 keypair. Public keys on the wire are 33 bytes (compressed) or 32 bytes (x-only, as Nostr uses). The curve's x-only convention lets a single npub serve as both a Nostr identity and a FIPS node identity without re-derivation.",
    lessons: [2, 9],
    tags: ["identity", "encryption"],
    acronyms: ["secp256k1"],
  },
  {
    id: "schnorr",
    term: "Schnorr signatures",
    expansion: "BIP340 Schnorr signature scheme",
    summary:
      "64-byte signatures over secp256k1, used to authenticate TreeAnnounce and LookupResponse.",
    detail:
      "FIPS uses BIP340 Schnorr signatures (the scheme Bitcoin Taproot and Nostr events also use). Signatures are 64 bytes. Routing-layer announcements that need to be verifiable by any receiver (TreeAnnounce, LookupResponse, revocations) carry a Schnorr signature under the signer's x-only pubkey.",
    lessons: [2, 9],
    tags: ["identity", "encryption"],
    acronyms: ["Schnorr", "BIP340"],
  },
  {
    id: "sha-256",
    term: "SHA-256",
    summary:
      "The hash function used to derive node_addr from a public key and to mix keys inside Noise.",
    detail:
      "SHA-256 of the 32-byte x-only pubkey, truncated to the first 16 bytes, gives the node_addr. It is also the hash primitive inside the Noise_IK and Noise_XK patterns FIPS uses (cipher suite: Noise_IK_25519_ChaChaPoly_SHA256).",
    lessons: [2, 9],
    tags: ["identity", "encryption"],
    acronyms: ["SHA-256", "SHA256"],
  },
  {
    id: "aead",
    term: "AEAD",
    expansion: "Authenticated Encryption with Associated Data",
    summary:
      "Encryption that produces a tag covering both the ciphertext and an extra plaintext header.",
    detail:
      "FIPS uses AEAD at both layers: FMP encrypts per-link with the 16-byte outer header as associated data; FSP encrypts end-to-end with the FSP header as associated data. A modified header fails authentication even though it was never encrypted, which is what lets transit routers read the routing envelope without being able to forge it.",
    lessons: [3, 6, 9],
    tags: ["encryption"],
    acronyms: ["AEAD"],
  },
  {
    id: "chacha20-poly1305",
    term: "ChaCha20-Poly1305",
    expansion: "AEAD cipher (RFC 8439)",
    summary: "The AEAD cipher FIPS uses for both FMP link encryption and FSP session encryption.",
    detail:
      "ChaCha20 is the stream cipher; Poly1305 is the MAC over the ciphertext plus the associated data, producing a 16-byte authentication tag at the end of the frame. ChaCha20-Poly1305 is constant-time on targets without AES hardware, which matters for the low-power nodes FIPS targets.",
    lessons: [6, 9],
    tags: ["encryption"],
    acronyms: ["ChaCha20-Poly1305", "ChaCha20", "Poly1305"],
  },
  {
    id: "ipv6-ula",
    term: "IPv6 ULA (fd00::/8)",
    summary:
      "Unique Local Address range used for FIPS IPv6 addresses so legacy apps can address mesh peers.",
    detail:
      "FIPS derives a per-node IPv6 address by prepending 0xfd to the first 15 bytes of the node_addr. The result sits in fd00::/8, which never collides with public IPv6 routing, and lets unmodified IPv6 software speak into the mesh via a TUN adapter.",
    lessons: [2, 7, 12],
    tags: ["identity", "compatibility"],
    acronyms: ["ULA"],
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
    id: "udp",
    term: "UDP",
    expansion: "User Datagram Protocol",
    summary:
      "The default overlay transport. FIPS listens on UDP 2121 and carries one FMP frame per UDP datagram.",
    detail:
      "UDP is the natural fit: FIPS is datagram-oriented, preserves packet boundaries, and avoids TCP-over-TCP interactions if FSP tunnels TCP. The default port is 2121. UDP does not traverse NAT by itself in FIPS v1; a node behind NAT needs port forwarding, a public peer, or a relay.",
    lessons: [4, 7, 13],
    tags: ["transport"],
    acronyms: ["UDP"],
  },
  {
    id: "tcp",
    term: "TCP",
    expansion: "Transmission Control Protocol",
    summary:
      "Optional fallback transport when UDP is blocked, and the most common guest traffic the IPv6 adapter carries.",
    detail:
      "FIPS prefers UDP because running FIPS inside TCP would stack two reliability layers on top of each other and interact badly under loss. TCP is available as a fallback transport where UDP is blocked. The IPv6 adapter also clamps TCP MSS on every SYN so guest connections size segments to the mesh path MTU.",
    lessons: [4, 12, 13],
    tags: ["transport"],
    acronyms: ["TCP"],
  },
  {
    id: "ble",
    term: "BLE",
    expansion: "Bluetooth Low Energy",
    summary:
      "Short-range transport over L2CAP connection-oriented channels, with per-link MTU negotiation.",
    detail:
      "BLE transports run over L2CAP CoC (connection-oriented channels), not GATT. MTU ranges roughly 23 to 517 bytes depending on the link, so FIPS aggressively negotiates up and relies on the mesh MTU advertisement to keep FSP datagrams from exceeding the link.",
    lessons: [4],
    tags: ["transport"],
    acronyms: ["BLE"],
  },
  {
    id: "mac-address",
    term: "MAC address",
    expansion: "Media Access Control",
    summary:
      "Layer-2 hardware identifier used by the Ethernet and WiFi transports to reach a direct peer.",
    detail:
      "FMP's Ethernet and WiFi drivers address peers by MAC. The MAC is opaque to everything above FMP: the routing envelope uses node_addr, not MAC. Not to be confused with the cryptographic MAC (message authentication code) produced by Poly1305, which authenticates each AEAD frame.",
    lessons: [4],
    tags: ["transport"],
    acronyms: ["MAC"],
  },
  {
    id: "nat",
    term: "NAT",
    expansion: "Network Address Translation",
    summary:
      "Router behaviour that rewrites source addresses and ports, and a problem FIPS v1 does not solve on its own.",
    detail:
      "A node behind NAT cannot accept unsolicited inbound UDP on 2121 without port forwarding, a publicly addressed peer to bounce through, or a relay path via other mesh nodes. The fips-gateway sidecar also uses NAT in the other direction: nftables DNAT/SNAT rules map a pool of fd01::/112 virtual IPs to mesh destinations so unmodified LAN hosts can reach them.",
    lessons: [4, 12],
    tags: ["transport", "compatibility"],
    acronyms: ["NAT"],
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
    acronyms: ["CP flag", "CP"],
  },
  {
    id: "error-signals",
    term: "Error signals",
    summary:
      "CoordsRequired, PathBroken, and MtuExceeded: explicit feedback from transit nodes to the source.",
    detail:
      "When a transit node cannot forward a SessionDatagram, it builds a new SessionDatagram back to the source with one of three FSP payloads (U flag set, plaintext): CoordsRequired (0x20) if it has no cached coordinates for the destination, PathBroken (0x21) if its cached coordinates put it at a local minimum, MtuExceeded (0x22) if the packet is too large for the next-hop link. Rate-limited to one per destination per 100ms at the transit node.",
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
    acronyms: ["MTU"],
  },
  {
    id: "sybil",
    term: "Sybil attack",
    summary: "One operator spinning up many fake identities to overwhelm a peer-to-peer protocol.",
    detail:
      "FIPS resists Sybil attacks two ways: per-peer handshake rate limits cap how quickly a single attacker can bring new identities online, and discretionary peering means operators in curated deployments hand-pick who they accept as a direct neighbor. Automatic peer discovery falls back to rate limits alone.",
    lessons: [11],
    tags: ["security"],
  },
  {
    id: "eclipse",
    term: "Eclipse attack",
    summary: "Surrounding a target node with attacker-controlled peers so the target sees a lie.",
    detail:
      "If every direct peer of a node is controlled by the same adversary, the adversary fully controls what that node learns about the mesh: which root it picks, which coordinates it caches, which destinations it can reach. The mitigation is diverse peering across independent operators and transports.",
    lessons: [11],
    tags: ["security"],
  },
  {
    id: "traffic-analysis",
    term: "Traffic analysis",
    summary:
      "Correlating packet timing and volume at multiple vantage points to infer who is talking to whom.",
    detail:
      "FIPS encrypts content at two layers but does not pad, mix, or cover traffic. A global passive observer who sees several transports at once can still correlate flows and infer communicating pairs. This is a documented non-goal: FIPS is not an anonymity network.",
    lessons: [11],
    tags: ["security"],
  },
  {
    id: "tun",
    term: "TUN device (fips0)",
    summary: "The kernel virtual interface the IPv6 adapter attaches to.",
    detail:
      "fips0 is a TUN device the adapter creates on startup. The kernel routes every fd00::/8 packet through it. The adapter's reader thread picks up outbound IPv6 packets; its writer thread hands inbound mesh traffic back to the kernel as complete IPv6 datagrams. TUN creation needs CAP_NET_ADMIN.",
    lessons: [12],
    tags: ["compatibility"],
    acronyms: ["TUN"],
  },
  {
    id: "identity-cache",
    term: "Identity cache",
    summary:
      "Per-node reverse lookup from fd00::/8 address to (node_addr, pubkey). Populated by DNS.",
    detail:
      "The IPv6-to-pubkey derivation is one-way, so the adapter cannot recover routing identity from the destination address alone. DNS for npub1...fips names primes the cache as a side effect of resolution. The cache is LRU-only (default 10K entries) with no TTL: the mapping is deterministic and never becomes stale.",
    lessons: [12],
    tags: ["compatibility"],
  },
  {
    id: "fips-gateway",
    term: "fips-gateway",
    summary: "Sidecar binary that lets unmodified LAN hosts reach mesh destinations through NAT.",
    detail:
      "The gateway runs next to the daemon. It forwards .fips DNS queries to the daemon's resolver, allocates a virtual IP from a configured pool (e.g. fd01::/112) for each destination, and installs per-mapping DNAT + SNAT + masquerade rules in an nftables table. LAN clients need only a route to the pool and DNS pointed at the gateway.",
    lessons: [12],
    tags: ["compatibility"],
  },
];

export function getTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((t) => t.id === id);
}
