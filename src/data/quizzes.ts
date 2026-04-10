import type { QuizQuestion } from "../lib/types";

export const quizzes: Record<string, QuizQuestion[]> = {
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
      explanation: "Transit routers see only the node_addr, a one-way hash of the public key. They cannot recover the npub from it.",
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
      explanation: "The IPv6 address is deterministic: 0xfd prefix + first 15 bytes of node_addr, placing it in the fd00::/8 ULA space.",
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
      explanation: "No election protocol. Each node independently picks the smallest node_addr it knows about. They all converge on the same answer.",
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
      explanation: "Bloom filters have no false negatives. If the filter says 'no', the destination is definitely not reachable through that peer.",
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
      explanation: "Each partition converges on its own root (smallest node_addr in the segment). When they rejoin, the globally-smallest root wins.",
    },
  ],
  "6-encryption": [
    {
      question: "Which Noise pattern does FMP (link layer) use?",
      options: ["Noise NK", "Noise XK", "Noise IK", "Noise XX"],
      correctIndex: 2,
      explanation: "FMP uses Noise IK because the initiator knows the responder's key from config. Single round-trip mutual authentication.",
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
      explanation: "Session traffic crosses untrusted intermediate nodes. XK delays the initiator's identity to msg3, encrypted under the full shared secret.",
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
      explanation: "Transit routers decrypt the link layer to read the routing envelope (node_addrs, TTL, path MTU) but cannot read the session-layer payload.",
    },
  ],
  "7-final": [
    {
      question: "What triggers coordinate discovery in FIPS?",
      options: [
        "A periodic broadcast every 30 seconds",
        "First contact with an unknown destination",
        "The root node pushing updates to all nodes",
        "DNS resolution at the ISP level",
      ],
      correctIndex: 1,
      explanation: "When a node needs to reach an unknown destination, it sends a LookupRequest that propagates via bloom-guided tree routing.",
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
      explanation: "SessionSetup carries src and dest coordinates in the clear (outside the Noise payload). Each transit node caches them as the packet passes through.",
    },
    {
      question: "What is the total per-packet overhead for IPv6 traffic through FIPS?",
      options: ["37 bytes", "77 bytes", "106 bytes", "150 bytes"],
      correctIndex: 1,
      explanation: "106 bytes base protocol overhead, minus 33 bytes saved by IPv6 header compression, plus 4 bytes port header = 77 bytes (FIPS_IPV6_OVERHEAD).",
    },
  ],
};
