import { useMemo, useState } from "react";

/**
 * Byte-level viewer for FIPS wire formats. Pick a scenario, see the
 * encapsulation tree with every field and its size. Bytes are drawn as
 * colored blocks. Running totals per layer appear on the right.
 *
 * All sizes come directly from fips-wire-formats.md. Where a field
 * depends on a parameter (tree depth for coordinate arrays, payload
 * length for data packets), the component recomputes totals as the
 * toggles change.
 */

type Layer = "transport" | "fmp-outer" | "fmp-inner" | "sd" | "fsp-hdr" | "fsp-inner" | "app";

interface Field {
  label: string;
  size: number;
  layer: Layer;
  note?: string;
}

interface Scenario {
  id: string;
  title: string;
  blurb: string;
  /** Whether to show the CP-flag coordinates toggle. */
  hasCp?: boolean;
  /** Whether to show the tree-depth slider. */
  hasDepth?: boolean;
  /** Whether to show the application payload slider (IPv6 data). */
  hasAppPayload?: boolean;
  /** Build the field list given current parameter values. */
  build: (opts: { cp: boolean; depth: number; appPayload: number }) => Field[];
}

const LAYER_COLORS: Record<Layer, string> = {
  transport: "#6b7280",
  "fmp-outer": "#22c55e",
  "fmp-inner": "#16a34a",
  sd: "#f59e0b",
  "fsp-hdr": "#3b82f6",
  "fsp-inner": "#60a5fa",
  app: "#a78bfa",
};

const LAYER_LABELS: Record<Layer, string> = {
  transport: "Transport",
  "fmp-outer": "FMP outer (AAD)",
  "fmp-inner": "FMP inner (AEAD plaintext)",
  sd: "SessionDatagram",
  "fsp-hdr": "FSP cleartext",
  "fsp-inner": "FSP inner (AEAD plaintext)",
  app: "Application",
};

/** Size in bytes of a coordinate array including its 2-byte LE count. */
function coordsBytes(depth: number): number {
  return 2 + 16 * (depth + 1);
}

function ipv6DataScenario(opts: { cp: boolean; depth: number; appPayload: number }): Field[] {
  const f: Field[] = [];
  f.push({
    label: "common prefix",
    size: 4,
    layer: "fmp-outer",
    note: "ver/phase/flags/payload_len",
  });
  f.push({ label: "receiver_idx", size: 4, layer: "fmp-outer" });
  f.push({ label: "counter", size: 8, layer: "fmp-outer", note: "AEAD nonce + replay" });
  f.push({ label: "timestamp", size: 4, layer: "fmp-inner", note: "session-relative ms" });
  f.push({ label: "msg_type", size: 1, layer: "fmp-inner", note: "0x00 SessionDatagram" });
  f.push({ label: "ttl", size: 1, layer: "sd" });
  f.push({ label: "path_mtu", size: 2, layer: "sd", note: "min'd at each hop" });
  f.push({ label: "src_addr", size: 16, layer: "sd", note: "source node_addr" });
  f.push({ label: "dest_addr", size: 16, layer: "sd", note: "destination node_addr" });
  f.push({
    label: "FSP common prefix",
    size: 4,
    layer: "fsp-hdr",
    note: "ver/phase=0/flags/payload_len",
  });
  f.push({ label: "counter", size: 8, layer: "fsp-hdr", note: "AEAD nonce + replay" });
  if (opts.cp) {
    const sz = coordsBytes(opts.depth);
    f.push({
      label: "src_coords",
      size: sz,
      layer: "fsp-hdr",
      note: `count(2) + ${opts.depth + 1} × 16B ancestry`,
    });
    f.push({
      label: "dest_coords",
      size: sz,
      layer: "fsp-hdr",
      note: `count(2) + ${opts.depth + 1} × 16B ancestry`,
    });
  }
  f.push({ label: "inner timestamp", size: 4, layer: "fsp-inner" });
  f.push({ label: "msg_type", size: 1, layer: "fsp-inner", note: "0x10 Data" });
  f.push({ label: "inner_flags", size: 1, layer: "fsp-inner", note: "SP spin bit, etc." });
  f.push({ label: "src_port", size: 2, layer: "fsp-inner" });
  f.push({ label: "dst_port", size: 2, layer: "fsp-inner", note: "0x0100 IPv6 shim" });
  f.push({ label: "shim format", size: 1, layer: "app", note: "0x00 compressed" });
  f.push({ label: "traffic_class", size: 1, layer: "app" });
  f.push({ label: "flow_label", size: 3, layer: "app" });
  f.push({ label: "next_header", size: 1, layer: "app" });
  f.push({ label: "hop_limit", size: 1, layer: "app" });
  f.push({
    label: "upper payload",
    size: opts.appPayload,
    layer: "app",
    note: "TCP/UDP/ICMPv6 payload",
  });
  f.push({ label: "Poly1305 tag (FSP)", size: 16, layer: "fsp-inner", note: "session AEAD tag" });
  f.push({ label: "Poly1305 tag (FMP)", size: 16, layer: "fmp-outer", note: "link AEAD tag" });
  return f;
}

function noiseIkMsg1(): Field[] {
  return [
    { label: "common prefix", size: 4, layer: "fmp-outer", note: "ver=0, phase=0x1" },
    { label: "sender_idx", size: 4, layer: "fmp-outer", note: "initiator's session index" },
    { label: "ephemeral_pubkey", size: 33, layer: "fmp-inner", note: "compressed secp256k1" },
    { label: "encrypted_static", size: 49, layer: "fmp-inner", note: "33B key + 16B AEAD tag" },
    { label: "encrypted_epoch", size: 24, layer: "fmp-inner", note: "8B epoch + 16B AEAD tag" },
  ];
}

function noiseIkMsg2(): Field[] {
  return [
    { label: "common prefix", size: 4, layer: "fmp-outer", note: "ver=0, phase=0x2" },
    { label: "sender_idx", size: 4, layer: "fmp-outer", note: "responder's session index" },
    { label: "receiver_idx", size: 4, layer: "fmp-outer", note: "echoes initiator's sender_idx" },
    { label: "ephemeral_pubkey", size: 33, layer: "fmp-inner", note: "compressed secp256k1" },
    { label: "encrypted_epoch", size: 24, layer: "fmp-inner", note: "8B epoch + 16B AEAD tag" },
  ];
}

function lookupRequest(opts: { depth: number }): Field[] {
  return [
    { label: "common prefix", size: 4, layer: "fmp-outer" },
    { label: "receiver_idx", size: 4, layer: "fmp-outer" },
    { label: "counter", size: 8, layer: "fmp-outer" },
    { label: "timestamp", size: 4, layer: "fmp-inner" },
    { label: "msg_type", size: 1, layer: "fmp-inner", note: "0x30 LookupRequest" },
    { label: "request_id", size: 8, layer: "sd" },
    { label: "target", size: 16, layer: "sd", note: "the node_addr being sought" },
    { label: "origin", size: 16, layer: "sd", note: "requester's node_addr" },
    { label: "ttl", size: 1, layer: "sd", note: "default 64" },
    { label: "min_mtu", size: 2, layer: "sd" },
    { label: "origin_coords_count", size: 2, layer: "sd" },
    {
      label: "origin_coords",
      size: 16 * (opts.depth + 1),
      layer: "sd",
      note: `${opts.depth + 1} × 16B ancestry`,
    },
    { label: "Poly1305 tag (FMP)", size: 16, layer: "fmp-outer", note: "link AEAD tag" },
  ];
}

function treeAnnounce(opts: { depth: number }): Field[] {
  return [
    { label: "common prefix", size: 4, layer: "fmp-outer" },
    { label: "receiver_idx", size: 4, layer: "fmp-outer" },
    { label: "counter", size: 8, layer: "fmp-outer" },
    { label: "timestamp", size: 4, layer: "fmp-inner" },
    { label: "msg_type", size: 1, layer: "fmp-inner", note: "0x10 TreeAnnounce" },
    { label: "version", size: 1, layer: "sd", note: "0x01" },
    { label: "sequence", size: 8, layer: "sd", note: "monotonic, bumps on parent change" },
    { label: "timestamp", size: 8, layer: "sd", note: "Unix seconds" },
    { label: "parent", size: 16, layer: "sd", note: "selected parent (self = root)" },
    { label: "ancestry_count", size: 2, layer: "sd" },
    {
      label: "ancestry",
      size: 32 * (opts.depth + 1),
      layer: "sd",
      note: `${opts.depth + 1} × (node_addr + seq + ts)`,
    },
    { label: "signature", size: 64, layer: "sd", note: "Schnorr over the whole message" },
    { label: "Poly1305 tag (FMP)", size: 16, layer: "fmp-outer", note: "link AEAD tag" },
  ];
}

function coordsRequired(): Field[] {
  return [
    { label: "common prefix", size: 4, layer: "fmp-outer" },
    { label: "receiver_idx", size: 4, layer: "fmp-outer" },
    { label: "counter", size: 8, layer: "fmp-outer" },
    { label: "timestamp", size: 4, layer: "fmp-inner" },
    { label: "msg_type", size: 1, layer: "fmp-inner", note: "0x00 SessionDatagram" },
    { label: "ttl", size: 1, layer: "sd" },
    { label: "path_mtu", size: 2, layer: "sd" },
    { label: "src_addr", size: 16, layer: "sd", note: "reporter node_addr" },
    { label: "dest_addr", size: 16, layer: "sd", note: "original source" },
    {
      label: "FSP common prefix",
      size: 4,
      layer: "fsp-hdr",
      note: "phase=0, U flag set (plaintext)",
    },
    { label: "msg_type", size: 1, layer: "fsp-inner", note: "0x20 CoordsRequired" },
    { label: "flags", size: 1, layer: "fsp-inner" },
    {
      label: "dest_addr",
      size: 16,
      layer: "fsp-inner",
      note: "node_addr that could not be routed",
    },
    { label: "reporter", size: 16, layer: "fsp-inner", note: "router that emitted the error" },
    { label: "Poly1305 tag (FMP)", size: 16, layer: "fmp-outer", note: "link AEAD tag" },
  ];
}

const SCENARIOS: Scenario[] = [
  {
    id: "ipv6-data",
    title: "IPv6 data packet",
    blurb:
      "An IPv6 ping inside FSP inside SessionDatagram inside FMP. Toggle CP to watch the cleartext coordinates appear between the FSP header and the ciphertext.",
    hasCp: true,
    hasDepth: true,
    hasAppPayload: true,
    build: (opts) => ipv6DataScenario(opts),
  },
  {
    id: "noise-ik-1",
    title: "Noise IK msg1",
    blurb:
      "The first link-handshake message. The link is still unauthenticated, so only the common prefix is in plaintext; everything else is encrypted under the handshake state.",
    build: () => noiseIkMsg1(),
  },
  {
    id: "noise-ik-2",
    title: "Noise IK msg2",
    blurb: "Responder's handshake reply. After this, both sides share the link session keys.",
    build: () => noiseIkMsg2(),
  },
  {
    id: "tree-announce",
    title: "TreeAnnounce",
    blurb:
      "Spanning-tree state swapped between direct peers. The Schnorr signature covers the whole message so peers can propagate it without trusting the relay.",
    hasDepth: true,
    build: (opts) => treeAnnounce(opts),
  },
  {
    id: "lookup-request",
    title: "LookupRequest",
    blurb:
      "Coordinate discovery message, routed through tree peers whose bloom filter contains the target. Origin coordinates let the response travel back along the reverse path.",
    hasDepth: true,
    build: (opts) => lookupRequest(opts),
  },
  {
    id: "coords-required",
    title: "CoordsRequired (plaintext error)",
    blurb:
      "A plaintext FSP error signal. The U flag in the FSP common prefix marks the packet as unencrypted, so no key is needed to read it.",
    build: () => coordsRequired(),
  },
];

function layerTotals(fields: Field[]): { layer: Layer; bytes: number }[] {
  const totals = new Map<Layer, number>();
  for (const f of fields) {
    totals.set(f.layer, (totals.get(f.layer) ?? 0) + f.size);
  }
  return (Object.keys(LAYER_LABELS) as Layer[])
    .filter((l) => totals.has(l))
    .map((l) => ({ layer: l, bytes: totals.get(l)! }));
}

function blockWidth(size: number): number {
  return Math.max(28, Math.min(180, 12 + Math.log2(size + 1) * 14));
}

export default function PacketInspector() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0]!.id);
  const [cp, setCp] = useState(false);
  const [depth, setDepth] = useState(3);
  const [appPayload, setAppPayload] = useState(64);
  const [selected, setSelected] = useState<number | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
  const fields = useMemo(
    () => scenario.build({ cp, depth, appPayload }),
    [scenario, cp, depth, appPayload]
  );
  const total = fields.reduce((a, f) => a + f.size, 0);
  const totals = layerTotals(fields);

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setScenarioId(s.id);
              setSelected(null);
            }}
            aria-pressed={scenarioId === s.id}
            className={
              scenarioId === s.id
                ? "px-3 py-1 rounded border border-fips-accent bg-fips-accent/10 text-fips-accent text-xs font-mono"
                : "px-3 py-1 rounded border border-fips-border text-fips-muted hover:text-fips-text text-xs font-mono"
            }
          >
            {s.title}
          </button>
        ))}
      </div>

      <p className="text-sm text-fips-muted mb-3">{scenario.blurb}</p>

      <div className="flex flex-wrap gap-4 items-center mb-4 text-xs">
        {scenario.hasCp && (
          <label className="flex items-center gap-2 text-fips-muted">
            <input
              type="checkbox"
              checked={cp}
              onChange={(e) => setCp(e.target.checked)}
              className="accent-fips-accent"
            />
            <span>
              CP flag <span className="text-fips-text">{cp ? "set" : "clear"}</span>
            </span>
          </label>
        )}
        {scenario.hasDepth && (
          <label className="flex items-center gap-2 text-fips-muted">
            <span>Tree depth</span>
            <input
              type="range"
              min={0}
              max={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="accent-fips-accent"
            />
            <span className="text-fips-text font-mono w-6 text-right">{depth}</span>
          </label>
        )}
        {scenario.hasAppPayload && (
          <label className="flex items-center gap-2 text-fips-muted">
            <span>Upper payload</span>
            <input
              type="range"
              min={0}
              max={1400}
              step={16}
              value={appPayload}
              onChange={(e) => setAppPayload(Number(e.target.value))}
              className="accent-fips-accent"
            />
            <span className="text-fips-text font-mono w-12 text-right">{appPayload}B</span>
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-mono mb-3">
        {totals.map((t) => (
          <span key={t.layer} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: LAYER_COLORS[t.layer] }}
              aria-hidden="true"
            />
            <span className="text-fips-muted">{LAYER_LABELS[t.layer]}</span>
            <span className="text-fips-text">{t.bytes}B</span>
          </span>
        ))}
        <span className="ml-auto text-fips-accent">Total: {total} bytes</span>
      </div>

      <div className="bg-fips-bg rounded p-3 mb-3 overflow-x-auto">
        <div className="flex flex-wrap gap-1" aria-label="Packet fields">
          {fields.map((f, i) => {
            const active = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(active ? null : i)}
                aria-label={`${f.label}, ${f.size} bytes, ${LAYER_LABELS[f.layer]}`}
                aria-pressed={active}
                style={{
                  width: blockWidth(f.size),
                  backgroundColor: LAYER_COLORS[f.layer] + (active ? "55" : "22"),
                  borderColor: active ? LAYER_COLORS[f.layer] : LAYER_COLORS[f.layer] + "77",
                }}
                className="text-left px-2 py-1 rounded border text-[10px] font-mono text-fips-text hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-fips-accent"
                title={`${f.label} · ${f.size}B`}
              >
                <span className="block truncate">{f.label}</span>
                <span className="block text-[9px] opacity-70">{f.size}B</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-fips-border p-3 min-h-[5.5rem] text-sm">
        {selected !== null && fields[selected] ? (
          <div aria-live="polite">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: LAYER_COLORS[fields[selected]!.layer] }}
                aria-hidden="true"
              />
              <span className="font-mono text-fips-accent">{fields[selected]!.label}</span>
              <span className="text-fips-muted text-xs">{fields[selected]!.size} bytes</span>
              <span className="text-fips-muted text-xs">
                · {LAYER_LABELS[fields[selected]!.layer]}
              </span>
            </div>
            <p className="text-fips-muted text-sm">
              {fields[selected]!.note ?? "No extra notes for this field."}
            </p>
          </div>
        ) : (
          <p className="text-fips-muted text-sm">
            Click any block above to see what the field is and what it means on the wire.
          </p>
        )}
      </div>
    </div>
  );
}
