import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Transport {
  name: string;
  mtu: string;
  reliable: boolean;
  connectionOriented: boolean;
  notes: string;
  status: "implemented" | "future";
}

interface Category {
  label: string;
  color: string;
  description: string;
  transports: Transport[];
}

const categories: Category[] = [
  {
    label: "Overlay",
    color: "border-blue-400/30 bg-blue-400/5",
    description: "Tunnels FIPS over existing networks",
    transports: [
      { name: "UDP/IP", mtu: "1280-1472", reliable: false, connectionOriented: false, notes: "Primary internet transport. No TCP-over-TCP problem.", status: "implemented" },
      { name: "TCP/IP", mtu: "1400", reliable: true, connectionOriented: true, notes: "For networks where UDP is blocked. Adds head-of-line blocking.", status: "implemented" },
      { name: "Tor", mtu: "1400", reliable: true, connectionOriented: true, notes: "Hides your IP from peers. 200ms-2s RTT. SOCKS5 outbound + onion service inbound.", status: "implemented" },
      { name: "WebSocket", mtu: "Stream", reliable: true, connectionOriented: true, notes: "Browser-compatible overlay.", status: "future" },
    ],
  },
  {
    label: "Shared Medium",
    color: "border-green-400/30 bg-green-400/5",
    description: "Broadcast/multicast-capable local media",
    transports: [
      { name: "Ethernet", mtu: "1500", reliable: false, connectionOriented: false, notes: "Raw AF_PACKET frames. EtherType 0x2121. Beacon discovery via broadcast.", status: "implemented" },
      { name: "WiFi", mtu: "1500", reliable: false, connectionOriented: false, notes: "Infrastructure mode works like Ethernet. Broadcast discovery unreliable in managed mode.", status: "future" },
      { name: "BLE", mtu: "23-517", reliable: true, connectionOriented: true, notes: "L2CAP CoC with per-link MTU negotiation.", status: "future" },
      { name: "Radio", mtu: "51-222", reliable: false, connectionOriented: false, notes: "Low bandwidth, long range. Constrained MTU.", status: "future" },
    ],
  },
  {
    label: "Point-to-Point",
    color: "border-amber-400/30 bg-amber-400/5",
    description: "Fixed connections between two endpoints",
    transports: [
      { name: "Serial", mtu: "256-1500", reliable: true, connectionOriented: true, notes: "SLIP/COBS framing. Physical wired connection.", status: "future" },
      { name: "Satellite", mtu: "Varies", reliable: false, connectionOriented: false, notes: "High latency, wide coverage.", status: "future" },
    ],
  },
];

export default function TransportGrid() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="my-8">
      <div className="text-center mb-6">
        <div className="inline-block rounded-full bg-fips-accent/10 text-fips-accent text-sm font-mono px-4 py-1">
          same protocol, same mesh
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <h3 className="text-sm font-semibold text-fips-muted uppercase tracking-wider mb-2">
              {cat.label}
            </h3>
            <p className="text-xs text-fips-muted mb-3">{cat.description}</p>
            <div className="space-y-2">
              {cat.transports.map((t) => {
                const isSelected = selected === `${cat.label}-${t.name}`;
                const key = `${cat.label}-${t.name}`;
                return (
                  <div key={key}>
                    <button
                      onClick={() => setSelected(isSelected ? null : key)}
                      className={`w-full text-left rounded-lg border p-3 transition-all text-sm ${cat.color} ${
                        isSelected ? "ring-1 ring-fips-accent/30" : "hover:brightness-125"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{t.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          t.status === "implemented"
                            ? "bg-fips-green/20 text-fips-green"
                            : "bg-fips-muted/20 text-fips-muted"
                        }`}>
                          {t.status === "implemented" ? "live" : "planned"}
                        </span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className={`rounded-b-lg border border-t-0 p-3 text-xs ${cat.color} space-y-1`}>
                            <div className="flex gap-4">
                              <span className="text-fips-muted">MTU:</span>
                              <span className="font-mono">{t.mtu}</span>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-fips-muted">Reliable:</span>
                              <span>{t.reliable ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-fips-muted">Connection:</span>
                              <span>{t.connectionOriented ? "Connection-oriented" : "Connectionless"}</span>
                            </div>
                            <p className="text-fips-muted pt-1">{t.notes}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
