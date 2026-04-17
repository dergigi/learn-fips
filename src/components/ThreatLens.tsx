import { useMemo, useState } from "react";

/**
 * ThreatLens: pick one adversary class and see which protocol artifacts
 * are visible to them, which are opaque, and which are authenticated.
 *
 * The matrix reflects fips-intro.md §Security and the layer specs:
 *
 *   - transport observer: sees link-encrypted FMP packets, timing, sizes
 *   - active attacker  : same, plus tampering defeated by FMP AEAD
 *   - direct peer      : FMP decrypts, sees routing gossip and node_addrs;
 *                        also sees its own peer's npub from FMP handshake
 *   - transit router   : forwards FMP; sees SessionDatagram routing
 *                        envelope and FSP cleartext header; FSP AEAD opaque
 *   - destination      : decrypts FSP, sees source npub and application
 *                        payload
 *   - malicious peer   : same view as a direct peer, plus the mesh-layer
 *                        attacks it can attempt
 */

type AdversaryId =
  | "transport-observer"
  | "active-attacker"
  | "direct-peer"
  | "transit-router"
  | "destination"
  | "malicious-peer";

type Visibility = "visible" | "opaque" | "signed" | "metadata";

interface Row {
  id: string;
  label: string;
  detail: string;
}

interface Adversary {
  id: AdversaryId;
  label: string;
  summary: string;
  visibility: Record<string, Visibility>;
  mitigations: string[];
}

const ROWS: Row[] = [
  {
    id: "timing",
    label: "Packet timing and sizes",
    detail: "Wire-level volume and inter-arrival gaps.",
  },
  {
    id: "transport-peers",
    label: "Transport endpoints",
    detail: "Underlying WiFi BSSID, IP:port pair, Bluetooth MAC, serial tty.",
  },
  {
    id: "fmp-payload",
    label: "FMP payload (routing gossip, session datagrams)",
    detail: "TreeAnnounce, BloomGossip, LookupRequest, MMP reports, forwarded SessionDatagrams.",
  },
  {
    id: "node-addr",
    label: "node_addr of the endpoints",
    detail: "The 128-bit SHA-256 of the public key carried in the session routing envelope.",
  },
  {
    id: "npub",
    label: "npub of the endpoints",
    detail: "The bech32 Nostr public key; the application-layer identity.",
  },
  {
    id: "fsp-payload",
    label: "FSP payload (application data)",
    detail: "The encapsulated IPv6 packet, stream chunk, or control message.",
  },
];

const ADVERSARIES: Adversary[] = [
  {
    id: "transport-observer",
    label: "Transport observer (passive)",
    summary:
      "Someone tcpdumping a WiFi network or Ethernet segment. Sees encrypted bytes, nothing else.",
    visibility: {
      timing: "visible",
      "transport-peers": "visible",
      "fmp-payload": "opaque",
      "node-addr": "opaque",
      npub: "opaque",
      "fsp-payload": "opaque",
    },
    mitigations: [
      "FMP Noise IK encrypts every link frame, including routing gossip.",
      "Traffic analysis across multiple vantage points is a documented non-goal.",
    ],
  },
  {
    id: "active-attacker",
    label: "Active attacker on the transport",
    summary:
      "Can inject, modify, drop, or replay transport packets. Still cannot decrypt or forge link frames.",
    visibility: {
      timing: "visible",
      "transport-peers": "visible",
      "fmp-payload": "opaque",
      "node-addr": "opaque",
      npub: "opaque",
      "fsp-payload": "opaque",
    },
    mitigations: [
      "FMP AEAD rejects tampered frames; Noise mutual auth blocks impersonation.",
      "Counter-based nonces plus sliding replay window reject replayed frames.",
    ],
  },
  {
    id: "direct-peer",
    label: "Direct peer (FMP-adjacent)",
    summary:
      "A neighbor one FMP hop away. Decrypts FMP, sees routing gossip, sees whatever you forward.",
    visibility: {
      timing: "visible",
      "transport-peers": "visible",
      "fmp-payload": "visible",
      "node-addr": "visible",
      npub: "metadata",
      "fsp-payload": "opaque",
    },
    mitigations: [
      "FSP Noise XK encrypts application payloads end to end.",
      "Source npub stays inside the FSP ciphertext; direct peers see only node_addr on forwarded sessions.",
      "Discretionary peering: you choose who becomes an FMP neighbor.",
    ],
  },
  {
    id: "transit-router",
    label: "Transit router (between endpoints)",
    summary:
      "A mesh node that forwards your FSP session but is not its endpoint. Sees routing envelope only.",
    visibility: {
      timing: "visible",
      "transport-peers": "metadata",
      "fmp-payload": "visible",
      "node-addr": "visible",
      npub: "opaque",
      "fsp-payload": "opaque",
    },
    mitigations: [
      "FSP session AEAD hides the payload even as each hop decrypts and re-encrypts FMP.",
      "The routing envelope carries node_addr only; a transit router cannot derive npub from it.",
      "Multi-path candidate selection spreads sessions across peers, limiting any one router's view.",
    ],
  },
  {
    id: "destination",
    label: "Destination (the other endpoint)",
    summary: "The other half of the FSP session. Sees your npub and decrypts your payload.",
    visibility: {
      timing: "visible",
      "transport-peers": "opaque",
      "fmp-payload": "opaque",
      "node-addr": "visible",
      npub: "visible",
      "fsp-payload": "visible",
    },
    mitigations: [
      "This is by design: FSP is a mutually authenticated, end-to-end channel.",
      "If you do not want the destination to know you, do not open an FSP session to them.",
    ],
  },
  {
    id: "malicious-peer",
    label: "Malicious peer (active in the mesh)",
    summary:
      "A direct peer trying to lie: bad TreeAnnounces, inflated bloom filters, coordinate forgery.",
    visibility: {
      timing: "visible",
      "transport-peers": "visible",
      "fmp-payload": "visible",
      "node-addr": "visible",
      npub: "metadata",
      "fsp-payload": "opaque",
    },
    mitigations: [
      "TreeAnnounce carries a Schnorr signature over the ancestry chain; forged coordinates fail validation.",
      "Per-peer rate limits on handshakes cap how fast a Sybil cluster can plug into the mesh.",
      "Eclipse resistance comes from diverse peering: pick peers across different operators and transports.",
    ],
  },
];

const BADGE: Record<Visibility, { label: string; cls: string }> = {
  visible: {
    label: "visible",
    cls: "bg-red-500/10 text-red-300 border-red-500/30",
  },
  metadata: {
    label: "metadata",
    cls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
  signed: {
    label: "authenticated",
    cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
  opaque: {
    label: "opaque",
    cls: "bg-fips-surface text-fips-muted border-fips-border",
  },
};

export default function ThreatLens() {
  const [adversaryId, setAdversaryId] = useState<AdversaryId>("transit-router");

  const adversary = useMemo(() => ADVERSARIES.find((a) => a.id === adversaryId)!, [adversaryId]);

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6">
      <label
        htmlFor="adversary-select"
        className="block text-xs uppercase tracking-wider text-fips-muted mb-2"
      >
        Adversary
      </label>
      <select
        id="adversary-select"
        value={adversaryId}
        onChange={(e) => setAdversaryId(e.target.value as AdversaryId)}
        className="w-full rounded border border-fips-border bg-fips-bg px-3 py-2 font-mono text-sm text-fips-text focus:outline-none focus:ring-2 focus:ring-fips-accent"
      >
        {ADVERSARIES.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>

      <p className="mt-3 text-sm text-fips-muted" aria-live="polite">
        {adversary.summary}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fips-border">
              <th className="text-left py-2 pr-4 text-fips-muted font-mono text-xs uppercase tracking-wider">
                Artifact
              </th>
              <th className="text-left py-2 text-fips-muted font-mono text-xs uppercase tracking-wider">
                Visibility
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const v = adversary.visibility[row.id] ?? "opaque";
              const badge = BADGE[v];
              return (
                <tr key={row.id} className="border-b border-fips-border/60 last:border-0">
                  <td className="py-2 pr-4 align-top">
                    <div className="text-fips-text">{row.label}</div>
                    <div className="text-xs text-fips-muted">{row.detail}</div>
                  </td>
                  <td className="py-2 align-top">
                    <span
                      className={
                        "inline-block rounded border px-2 py-0.5 font-mono text-[11px] " + badge.cls
                      }
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wider text-fips-muted mb-2">What stops them</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-fips-text">
          {adversary.mitigations.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
