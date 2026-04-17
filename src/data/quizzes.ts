import type { QuizQuestion } from "../lib/types";
import {
  FIPS_BASE_OVERHEAD,
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
};
