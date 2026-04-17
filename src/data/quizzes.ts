import type { QuizQuestion } from "../lib/types";
import {
  FIPS_BASE_OVERHEAD,
  FIPS_COORDS_RESPONSE_INTERVAL_MS,
  FIPS_COORDS_WARMUP_PACKETS,
  FIPS_ERROR_RATE_LIMIT_MS,
  FIPS_IPV6_HEADER_SAVINGS,
  FIPS_IPV6_OVERHEAD,
  FIPS_IPV6_PORT_HEADER,
} from "../lib/constants";

export function getQuiz(slug: string): QuizQuestion[] {
  const q = quizzes[slug];
  if (!q) throw new Error(`No quiz defined for lesson: ${slug}`);
  return q;
}

export function hasQuiz(slug: string): boolean {
  return slug in quizzes;
}

export const quizzes: Record<string, QuizQuestion[]> = {
  "1-what-is-fips": [
    {
      question: "Which of these best captures what makes FIPS different from the classic internet?",
      options: [
        "It uses faster cryptography than TLS.",
        "It replaces centralized services (ISPs, DNS, CAs) with a self-organizing peer mesh.",
        "It is a drop-in replacement for IPv4 addressing.",
        "It only works over WiFi and Bluetooth.",
      ],
      correctIndex: 1,
      explanation:
        "FIPS is a peer-to-peer mesh: identity, naming, routing and encryption all come from the nodes themselves, not from centralized providers.",
    },
    {
      question: "What does 'transport-agnostic' mean in the FIPS context?",
      options: [
        "Every packet must travel over every transport.",
        "FIPS is only defined over UDP.",
        "Any datagram-capable medium (WiFi, Ethernet, UDP overlay, Tor, serial, …) can carry FIPS traffic.",
        "Transports must be identical on both sides of a link.",
      ],
      correctIndex: 2,
      explanation:
        "Transports are pluggable drivers. The protocol above them is unchanged; only framing and peer discovery differ per transport.",
    },
    {
      question: "Which problem does FIPS NOT try to solve by itself?",
      options: [
        "Bootstrapping identity without a central CA.",
        "Making a mesh self-organize without a coordinator.",
        "Replacing every application protocol above it.",
        "Hiding endpoint identities from transit routers.",
      ],
      correctIndex: 2,
      explanation:
        "FIPS is a networking layer. Applications still speak their own protocols on top of it; FIPS just delivers their packets.",
    },
  ],
  "2-identity": [
    {
      question: "What cryptographic curve does FIPS use for node identity?",
      options: ["Ed25519", "secp256k1", "P-256 (NIST)", "Curve25519"],
      correctIndex: 1,
      explanation: "FIPS uses Nostr keypairs, which are secp256k1. Same curve as Bitcoin.",
    },
    {
      question: "A transit router forwarding your packet can see your:",
      options: ["npub (public key)", "node_addr (SHA-256 hash)", "Private key", "IPv6 address"],
      correctIndex: 1,
      explanation:
        "Transit routers see only the node_addr, a one-way hash of the public key. They cannot recover the npub from it.",
    },
    {
      question: "How is a FIPS IPv6 address derived?",
      options: [
        "Assigned by a DHCP server",
        "Random generation",
        "Prepend 0xfd to the first 15 bytes of node_addr",
        "Hash of the IP address of the first peer",
      ],
      correctIndex: 2,
      explanation:
        "The IPv6 address is deterministic: 0xfd prefix + first 15 bytes of node_addr, placing it in the fd00::/8 ULA space.",
    },
  ],
  "3-protocol-stack": [
    {
      question:
        "Which layer handles end-to-end encryption between the original sender and recipient?",
      options: [
        "FMP (FIPS Mesh Protocol)",
        "FSP (FIPS Session Protocol)",
        "MMP (Measurement Protocol)",
        "The TUN adapter",
      ],
      correctIndex: 1,
      explanation:
        "FSP wraps the user's payload in Noise XK between the two endpoints. Transit routers can re-encrypt link segments at the FMP layer but never see FSP plaintext.",
    },
    {
      question: "Why does every link re-encrypt the packet under a fresh Noise IK session (FMP)?",
      options: [
        "So transit routers can read the payload.",
        "To authenticate each hop and hide packet contents from observers on that specific medium.",
        "To prevent the recipient from decrypting the packet.",
        "To reduce packet size.",
      ],
      correctIndex: 1,
      explanation:
        "Hop-by-hop encryption authenticates neighbors and hides packet contents from anyone watching the physical link, without ever exposing the end-to-end payload.",
    },
    {
      question: `What is the net per-packet overhead for IPv6 traffic through FIPS, and how is it computed?`,
      options: [
        `${FIPS_BASE_OVERHEAD} bytes — the full base protocol overhead, with no optimizations.`,
        `${FIPS_IPV6_OVERHEAD} bytes = ${FIPS_BASE_OVERHEAD} base − ${FIPS_IPV6_HEADER_SAVINGS} (IPv6 header compression) + ${FIPS_IPV6_PORT_HEADER} (port header).`,
        `${FIPS_IPV6_HEADER_SAVINGS} bytes, because IPv6 compression removes the rest.`,
        `0 bytes — FIPS inherits the IPv6 MTU unchanged.`,
      ],
      correctIndex: 1,
      explanation: `Base protocol overhead is ${FIPS_BASE_OVERHEAD}B; the IPv6 adapter saves ${FIPS_IPV6_HEADER_SAVINGS}B via header compression and adds a ${FIPS_IPV6_PORT_HEADER}B port header, netting ${FIPS_IPV6_OVERHEAD}B (FIPS_IPV6_OVERHEAD in src/lib/constants.ts).`,
    },
  ],
  "4-transports": [
    {
      question: "Which of the following could NOT reasonably be a FIPS transport?",
      options: [
        "UDP overlay over the public internet.",
        "A direct Ethernet LAN segment.",
        "A Tor onion service endpoint.",
        "Something that has no way to move bytes between machines.",
      ],
      correctIndex: 3,
      explanation:
        "Anything that can move datagrams between two peers can be a transport. 'No way to move bytes' is the one thing FIPS can't paper over.",
    },
    {
      question: "What must two nodes have in common to link over a given transport?",
      options: [
        "The same operating system.",
        "A shared static FIPS key distributed out of band.",
        "Both must speak that transport's framing and discovery protocol.",
        "Both must be on the same physical medium.",
      ],
      correctIndex: 2,
      explanation:
        "Each transport defines its own framing and peer discovery. If both peers implement the same transport driver, they can form a FIPS link.",
    },
    {
      question:
        "A node is on WiFi and Ethernet at the same time. What does FIPS do with these transports?",
      options: [
        "Forces one of them to shut down.",
        "Runs both independently; the node can bridge peers on different media into the same mesh.",
        "Encapsulates one inside the other.",
        "Requires the user to pick a primary transport.",
      ],
      correctIndex: 1,
      explanation:
        "Transports are independent drivers. A node can run many at once and acts as a bridge between peers that don't share a medium.",
    },
  ],
  "5-spanning-tree": [
    {
      question: "How is the root of the spanning tree chosen?",
      options: [
        "Nodes vote in an election",
        "The node with the most peers",
        "The node with the smallest node_addr",
        "A centrally designated coordinator",
      ],
      correctIndex: 2,
      explanation:
        "No election protocol. Each node independently picks the smallest node_addr it knows about. They all converge on the same answer.",
    },
    {
      question: "What does a bloom filter 'no' answer mean?",
      options: [
        "The destination probably can't be reached through this peer",
        "The destination definitely can't be reached through this peer",
        "The peer is offline",
        "The destination doesn't exist",
      ],
      correctIndex: 1,
      explanation:
        "Bloom filters have no false negatives. If the filter says 'no', the destination is definitely not reachable through that peer.",
    },
    {
      question: "When the network partitions, what happens?",
      options: [
        "All nodes stop routing",
        "Each segment elects its own root and operates independently",
        "The partition is ignored until manual intervention",
        "Nodes flood the network trying to find the original root",
      ],
      correctIndex: 1,
      explanation:
        "Each partition converges on its own root (smallest node_addr in the segment). When they rejoin, the globally-smallest root wins.",
    },
  ],
  "6-encryption": [
    {
      question: "Which Noise pattern does FMP (link layer) use?",
      options: ["Noise NK", "Noise XK", "Noise IK", "Noise XX"],
      correctIndex: 2,
      explanation:
        "FMP uses Noise IK because the initiator knows the responder's key from config. Single round-trip mutual authentication.",
    },
    {
      question: "Why does FSP use Noise XK instead of IK?",
      options: [
        "XK is faster",
        "XK hides the initiator's identity until the third message",
        "IK doesn't support secp256k1",
        "XK provides better forward secrecy",
      ],
      correctIndex: 1,
      explanation:
        "Session traffic crosses untrusted intermediate nodes. XK delays the initiator's identity to msg3, encrypted under the full shared secret.",
    },
    {
      question: "What can an intermediate router see when forwarding a packet?",
      options: [
        "The full payload and both identities",
        "Source and destination node_addrs, packet size, timing",
        "Only the destination node_addr",
        "Nothing at all; the packet is opaque",
      ],
      correctIndex: 1,
      explanation:
        "Transit routers decrypt the link layer to read the routing envelope (node_addrs, TTL, path MTU) but cannot read the session-layer payload.",
    },
  ],
  "7-putting-it-together": [
    {
      question: "What triggers coordinate discovery in FIPS?",
      options: [
        "A periodic broadcast every 30 seconds",
        "First contact with an unknown destination",
        "The root node pushing updates to all nodes",
        "DNS resolution at the ISP level",
      ],
      correctIndex: 1,
      explanation:
        "When a node needs to reach an unknown destination, it sends a LookupRequest that propagates via bloom-guided tree routing.",
    },
    {
      question: "How does SessionSetup warm transit node caches?",
      options: [
        "It sends a separate cache-warming packet to every node on the path",
        "It carries plaintext coordinates that transit nodes extract and cache",
        "It doesn't; caches warm passively from data packets",
        "The root distributes coordinate tables to all nodes",
      ],
      correctIndex: 1,
      explanation:
        "SessionSetup carries src and dest coordinates in the clear (outside the Noise payload). Each transit node caches them as the packet passes through.",
    },
    {
      question: "What is the total per-packet overhead for IPv6 traffic through FIPS?",
      options: [
        `${FIPS_IPV6_OVERHEAD - 40} bytes`,
        `${FIPS_IPV6_OVERHEAD} bytes`,
        `${FIPS_BASE_OVERHEAD} bytes`,
        `${FIPS_BASE_OVERHEAD + 44} bytes`,
      ],
      correctIndex: 1,
      explanation: `${FIPS_BASE_OVERHEAD} bytes base protocol overhead, minus ${FIPS_IPV6_HEADER_SAVINGS} bytes saved by IPv6 header compression, plus ${FIPS_IPV6_PORT_HEADER} bytes port header = ${FIPS_IPV6_OVERHEAD} bytes (FIPS_IPV6_OVERHEAD).`,
    },
  ],
  "8-recovery": [
    {
      question: "What does the CP flag on an FSP data packet tell a transit router?",
      options: [
        "The packet should be dropped after forwarding.",
        "The packet contains cleartext source and destination coordinates it can cache.",
        "The packet is encrypted and opaque to transit routers.",
        "The packet requires an acknowledgement from the destination.",
      ],
      correctIndex: 1,
      explanation:
        "CP (Coordinates Piggyback) means the FSP header is followed by cleartext src and dst coordinates before the AEAD ciphertext. Transit routers extract them into the coordinate cache without decrypting anything.",
    },
    {
      question: `How many data packets at the start of a session carry the CP flag by default?`,
      options: ["1", `${FIPS_COORDS_WARMUP_PACKETS}`, "10", "Every packet, always"],
      correctIndex: 1,
      explanation: `The default is ${FIPS_COORDS_WARMUP_PACKETS} packets (node.session.coords_warmup_packets). After that, FSP clears the CP flag until a CoordsRequired or PathBroken signal resets the counter.`,
    },
    {
      question:
        "Which error signal means 'I have coordinates for the destination, but no peer is closer to it than I am'?",
      options: [
        "CoordsRequired (0x15)",
        "PathBroken (0x16)",
        "MtuExceeded (0x17)",
        "SessionReject",
      ],
      correctIndex: 1,
      explanation:
        "PathBroken is the greedy-routing dead end. The cached coordinates exist but are likely stale: the tree moved.",
    },
    {
      question:
        "On receiving PathBroken, what does the source do differently from when it receives CoordsRequired?",
      options: [
        "It tears down and re-establishes the Noise XK session.",
        "It always initiates a fresh LookupRequest and removes its own cached coordinates for the destination.",
        "It stops sending to that destination for 90 seconds.",
        "It ignores the signal because PathBroken is informational.",
      ],
      correctIndex: 1,
      explanation:
        "PathBroken is always followed by discovery and a local cache eviction. CoordsRequired resets warmup and sends CoordsWarmup, but discovery is optional.",
    },
    {
      question: "Why does FIPS rate-limit error signals at the transit node?",
      options: [
        "Because error signals are expensive to encrypt.",
        `To prevent storms: many packets to the same broken destination would otherwise generate one error per packet. The cap is one per destination per ${FIPS_ERROR_RATE_LIMIT_MS}ms.`,
        "To allow destinations to reject too many errors.",
        "Because routers have no way to address the source.",
      ],
      correctIndex: 1,
      explanation: `Transit routers emit at most one error signal per destination per ${FIPS_ERROR_RATE_LIMIT_MS}ms. The source independently rate-limits its CoordsWarmup responses to one per destination per ${FIPS_COORDS_RESPONSE_INTERVAL_MS}ms.`,
    },
    {
      question: "What does MtuExceeded cause the source to do?",
      options: [
        "Re-run the Noise XK handshake.",
        "Clamp its session-layer path MTU estimate to the reported bottleneck and resend with smaller payloads.",
        "Delete the destination from its coordinate cache.",
        "Drop the session and open a new one.",
      ],
      correctIndex: 1,
      explanation:
        "MtuExceeded is purely about sizing. No discovery, no warmup reset, no key change: FSP lowers path_mtu and fits subsequent packets under it.",
    },
  ],
  "9-wire-formats": [
    {
      question: "How many bytes is the FMP common prefix, and what does it contain?",
      options: [
        "2 bytes: just the phase and payload length.",
        "4 bytes: version (4 bits), phase (4 bits), flags (1B), payload_len (2B LE).",
        "6 bytes: version, phase, flags, payload_len, and counter.",
        "It varies with the message type.",
      ],
      correctIndex: 1,
      explanation:
        "Version + phase share the first byte (4 bits each). The next byte is flags. The last two bytes are the little-endian payload length.",
    },
    {
      question: "What is the purpose of the receiver_idx field in an established FMP frame?",
      options: [
        "A random nonce for each packet.",
        "A 4-byte LE session index so the receiver looks up its session state in O(1).",
        "The TTL for the packet.",
        "The encryption algorithm identifier.",
      ],
      correctIndex: 1,
      explanation:
        "Each peer picks its own index and tells the other side to include it as receiver_idx in packets sent in that direction. One array lookup lands on the right session.",
    },
    {
      question: "Which field is excluded from the LookupResponse's Schnorr signature, and why?",
      options: [
        "request_id, because it is random.",
        "target_coords, because they are cached at the source already.",
        "path_mtu, because every transit hop rewrites it.",
        "target, because it is derived from the request.",
      ],
      correctIndex: 2,
      explanation:
        "path_mtu is a transit annotation: each hop does min(path_mtu, link_mtu). Covering it with the signature would invalidate the proof at every hop.",
    },
    {
      question:
        "A transit router sees a SessionDatagram go by. What can it read, and what is it blind to?",
      options: [
        "It can read everything including the session payload.",
        "It can read nothing; all bytes are encrypted end-to-end.",
        "It can read the routing envelope (ttl, path_mtu, src_addr, dest_addr) and the FSP common prefix, but the FSP AEAD payload is opaque.",
        "It can read only the destination address.",
      ],
      correctIndex: 2,
      explanation:
        "After decrypting the link layer, the transit router sees the 36-byte SessionDatagram header and the 12-byte FSP cleartext header. The session AEAD ciphertext stays sealed.",
    },
    {
      question: `IPv6 traffic through FIPS has ${FIPS_IPV6_OVERHEAD} bytes of net overhead. Where does the number come from?`,
      options: [
        `${FIPS_BASE_OVERHEAD} bytes of protocol envelope, with no adjustments for IPv6.`,
        `${FIPS_BASE_OVERHEAD} base − ${FIPS_IPV6_HEADER_SAVINGS} saved by IPv6 header compression + ${FIPS_IPV6_PORT_HEADER} port header = ${FIPS_IPV6_OVERHEAD} bytes.`,
        `${FIPS_IPV6_HEADER_SAVINGS} bytes, because IPv6 compression strips the rest.`,
        `${FIPS_IPV6_OVERHEAD} − ${FIPS_IPV6_PORT_HEADER} = ${FIPS_IPV6_OVERHEAD - FIPS_IPV6_PORT_HEADER} bytes.`,
      ],
      correctIndex: 1,
      explanation: `The IPv6 shim turns the 40-byte IPv6 header into 7 bytes of residual fields, saving ${FIPS_IPV6_HEADER_SAVINGS} bytes. The ${FIPS_IPV6_PORT_HEADER}-byte port header pushes it back up, netting ${FIPS_IPV6_OVERHEAD}B above a bare IPv6 packet.`,
    },
    {
      question: "How does a receiver know whether an FSP packet carries cleartext coordinates?",
      options: [
        "The payload_len field is larger than usual.",
        "The CP bit is set in the FSP common prefix flags.",
        "The ttl field in the SessionDatagram is zero.",
        "Coordinates always follow the header.",
      ],
      correctIndex: 1,
      explanation:
        "CP (Coordinates Piggyback) is a flag in the FSP common prefix. When it is clear, the ciphertext starts right after the 12-byte header.",
    },
  ],
  "10-mmp": [
    {
      question: "In full mode, what two MMP messages does each peer link exchange?",
      options: [
        "SenderReport and ReceiverReport.",
        "PING and PONG.",
        "Only ReceiverReport; SenderReport is reserved.",
        "CoordsRequired and PathBroken.",
      ],
      correctIndex: 0,
      explanation:
        "Full mode runs both reports. Lightweight mode drops SenderReport (no RTT). Minimal mode drops both and relies on spin bit + CE.",
    },
    {
      question: "What does MMP actually use to compute SRTT?",
      options: [
        "Spin-bit reflection timing on regular data frames.",
        "Kernel-reported socket RTT.",
        "The timestamp_echo and dwell_time fields in ReceiverReport.",
        "A three-way handshake at session start.",
      ],
      correctIndex: 2,
      explanation:
        "The sender stamps each frame with a timestamp. The receiver echoes it along with its dwell time. The sender subtracts dwell from the observed delay and feeds the sample into the SRTT EWMA.",
    },
    {
      question:
        "Why does FIPS implement the spin bit's reflection state machine but discard its RTT samples?",
      options: [
        "The spin bit is encrypted and unreadable.",
        "Inter-frame processing delays (timers for announces, bloom filters, MMP) inflate spin-bit RTT unpredictably.",
        "Spin-bit RTT duplicates ICMP echo.",
        "The TX side is not implemented yet.",
      ],
      correctIndex: 1,
      explanation:
        "Frames on a peer link are not driven by the data stream alone. Announces, bloom-filter gossip, and MMP itself add jitter that shows up as spin-bit RTT noise. The reflection is kept so external observers still work, but timestamp-echo is the only internal RTT source.",
    },
    {
      question: "A peer has ETX = 2.0 and SRTT = 50ms. What is its link_cost?",
      options: ["1.0", "2.5", "3.0", "4.0"],
      correctIndex: 2,
      explanation: "link_cost = ETX × (1 + SRTT_ms / 100) = 2.0 × (1 + 0.5) = 3.0.",
    },
    {
      question: "What does parent_hysteresis (default 0.2) protect against?",
      options: [
        "Loss rates above 20%.",
        "Peers going offline.",
        "Oscillation between two parents whose link costs are within noise of each other.",
        "Bloom filter false positives.",
      ],
      correctIndex: 2,
      explanation:
        "A new candidate must improve effective_depth by at least 20% over the current parent before the switch happens. Two peers with nearly equal costs will not trigger a flap.",
    },
    {
      question:
        "When a transit node sets the CE flag, what eventually makes a guest TCP stack slow down?",
      options: [
        "The mesh layer opens a TCP RST back to the sender.",
        "The IPv6 adapter marks the TCP segment's ECN bits CE; the receiver echoes ECE; the sender's TCP cuts its window.",
        "MMP sends a control message to the guest kernel.",
        "The FSP session is torn down and reopened.",
      ],
      correctIndex: 1,
      explanation:
        "CE is sticky across hops. At the final destination the IPv6 adapter writes CE into the Traffic Class ECN bits (only if the inner packet was ECT-capable). Standard TCP ECN then takes over end to end.",
    },
  ],
  "11-threat-model": [
    {
      question:
        "Which layer defends against a passive observer on the underlying WiFi or Ethernet?",
      options: [
        "FSP Noise XK session encryption.",
        "FMP Noise IK link encryption.",
        "Schnorr-signed TreeAnnounces.",
        "Bloom filter split-horizon propagation.",
      ],
      correctIndex: 1,
      explanation:
        "FMP wraps every link frame (routing gossip included) in a Noise IK AEAD session, so a tcpdump on the underlying transport only yields ciphertext.",
    },
    {
      question:
        "A transit router forwards an FSP session between two other nodes. What can it read?",
      options: [
        "The source and destination npubs.",
        "The application payload inside the FSP AEAD.",
        "The SessionDatagram routing envelope (node_addrs, ttl, path_mtu) and the FSP cleartext header.",
        "Nothing: transit routers receive encrypted opaque blobs.",
      ],
      correctIndex: 2,
      explanation:
        "Transit routers decrypt FMP to learn what to forward. They see node_addrs on the routing envelope and the FSP cleartext header (flags, receiver_idx, counter). The FSP AEAD payload stays sealed, and npub never appears there.",
    },
    {
      question: "Why does the routing envelope carry node_addr instead of npub?",
      options: [
        "node_addr is shorter, so packets are smaller.",
        "It lets routers forward traffic without learning which Nostr identities are communicating.",
        "npub is not defined at the mesh layer.",
        "node_addr is required by IPv6.",
      ],
      correctIndex: 1,
      explanation:
        "node_addr is a SHA-256 hash of the public key. Routers route on it; they cannot recover the npub from it. Someone who already knows a candidate npub can test a match, but they cannot enumerate from routed traffic.",
    },
    {
      question: "Which of these is NOT a claim FIPS makes?",
      options: [
        "Direct peers cannot read forwarded session payloads.",
        "Active attackers on the transport cannot inject or modify link frames.",
        "FIPS hides the fact that a conversation is happening from a global observer.",
        "Transit routers cannot derive endpoint npubs from routed packets.",
      ],
      correctIndex: 2,
      explanation:
        "Traffic analysis is a documented non-goal. FIPS protects confidentiality and integrity. It does not pad or mix, so a global observer with vantage on multiple transports can still correlate who is talking to whom.",
    },
    {
      question:
        "In an open network with automatic peer discovery, what primarily resists Sybil attacks?",
      options: [
        "Noise XK identity hiding.",
        "Per-peer handshake rate limits.",
        "Bloom filter bit diversity.",
        "IPv6 ULA randomization.",
      ],
      correctIndex: 1,
      explanation:
        "Curated deployments rely on discretionary peering (operators vet their peers). Open deployments fall back to rate-limiting how fast any one attacker can hand-shake new identities onto the mesh.",
    },
    {
      question: "Why is topological diversity the main defense against eclipse attacks?",
      options: [
        "Signed announces stop working when many identities collude.",
        "Peering across independent operators and transports makes it hard for one adversary to control all of your peers at once.",
        "The spanning tree rebuilds faster with more peers.",
        "Encryption fails if every peer is hostile.",
      ],
      correctIndex: 1,
      explanation:
        "If every direct peer of a target is controlled by the same adversary, that adversary dictates the target's view of the mesh. No amount of cryptography fixes that. The defense is topological: spread peers across operators and transports.",
    },
  ],
};
