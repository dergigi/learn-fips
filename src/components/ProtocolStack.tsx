import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Layer {
  name: string;
  color: string;
  does: string;
  knows: string[];
  cannotSee: string[];
  wireHint: string;
}

const layers: Layer[] = [
  {
    name: "Application Interface",
    color: "text-purple-400 border-purple-400/30 bg-purple-400/5",
    does: "Native API for npub-addressed datagrams, or IPv6 TUN adapter for legacy apps like SSH and curl.",
    knows: ["Destination npub or IPv6 address", "Payload data"],
    cannotSee: ["Which transports carry the traffic", "How many hops separate you from the destination", "Routing topology"],
    wireHint: "IPv6 packets or raw datagrams handed to FSP.",
  },
  {
    name: "FSP (Session Protocol)",
    color: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    does: "End-to-end Noise XK encryption between any two nodes, regardless of how many hops separate them.",
    knows: ["Both endpoints' npubs", "Session keys", "Replay counters"],
    cannotSee: ["Network topology", "Which transport is used", "How packets are routed between hops"],
    wireHint: "12-byte header (AAD) + AEAD ciphertext. Counter for replay protection.",
  },
  {
    name: "FMP (Mesh Protocol)",
    color: "text-green-400 border-green-400/30 bg-green-400/5",
    does: "Hop-by-hop Noise IK encryption, spanning tree self-organization, bloom filter gossip, and forwarding decisions.",
    knows: ["Direct peers and their identities", "Spanning tree position", "Bloom filter reachability", "Source/dest node_addrs in routing headers"],
    cannotSee: ["Session-layer payload (encrypted by FSP)", "Application-layer content", "Endpoints' npubs (only sees node_addr hashes)"],
    wireHint: "16-byte outer header (AAD) + encrypted inner: timestamp + msg_type + payload + AEAD tag.",
  },
  {
    name: "Transport",
    color: "text-amber-400 border-amber-400/30 bg-amber-400/5",
    does: "Delivers datagrams between transport-specific endpoints. UDP socket, Ethernet frame, Tor circuit, serial line.",
    knows: ["Transport addresses (IP:port, MAC, .onion)", "MTU of the medium", "Whether the link is up"],
    cannotSee: ["FIPS identities", "Routing decisions", "Anything above the encrypted FMP frame"],
    wireHint: "Raw datagram delivery. FMP common prefix provides framing for stream transports.",
  },
];

export default function ProtocolStack() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="my-8 space-y-2">
      {layers.map((layer, i) => {
        const isOpen = expanded === i;
        return (
          <div key={i}>
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className={`w-full text-left rounded-lg border p-4 transition-all ${layer.color} ${
                isOpen ? "ring-1 ring-current/20" : "hover:brightness-125"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs opacity-60">L{layers.length - i}</span>
                  <span className="font-semibold">{layer.name}</span>
                </div>
                <span className="text-xs opacity-60">{isOpen ? "▾" : "▸"}</span>
              </div>
              {!isOpen && (
                <p className="text-sm opacity-70 mt-1 ml-8">{layer.does}</p>
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className={`rounded-b-lg border border-t-0 p-4 ${layer.color} space-y-4`}>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider opacity-60 mb-1">What it does</h4>
                      <p className="text-sm">{layer.does}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider opacity-60 mb-1">Knows about</h4>
                        <ul className="text-sm space-y-1">
                          {layer.knows.map((item, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-fips-green mt-0.5">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-wider opacity-60 mb-1">Cannot see</h4>
                        <ul className="text-sm space-y-1">
                          {layer.cannotSee.map((item, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-fips-red mt-0.5">✗</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs uppercase tracking-wider opacity-60 mb-1">On the wire</h4>
                      <p className="text-sm font-mono opacity-80">{layer.wireHint}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
