import { useMemo, useState } from "react";
import {
  FIPS_BASE_OVERHEAD,
  FIPS_IPV6_HEADER_SAVINGS,
  FIPS_IPV6_OVERHEAD,
  FIPS_IPV6_PORT_HEADER,
  IPV6_HEADER_BYTES,
  IPV6_MIN_MTU,
  TCP_HEADER_BYTES,
} from "../lib/constants";

/**
 * AdapterMtuLab: pick a transport MTU and an application packet size, see:
 *   - the effective IPv6 MTU the TUN exposes,
 *   - the TCP MSS the adapter clamps SYN / SYN-ACK down to,
 *   - whether a packet of the chosen size fits or triggers ICMPv6
 *     Packet Too Big.
 *
 * Formulas come from fips-ipv6-adapter.md:
 *   effective_ipv6_mtu = transport_mtu - FIPS_IPV6_OVERHEAD       (77 bytes)
 *   clamped_tcp_mss    = effective_ipv6_mtu - 40 (IPv6) - 20 (TCP)
 *
 * A transport MTU below 1357 (= 1280 + 77) cannot carry IPv6 at all, since
 * IPv6 mandates a 1280-byte minimum link MTU. The lab surfaces that
 * boundary rather than clipping silently.
 */

const TRANSPORT_PRESETS: { label: string; mtu: number }[] = [
  { label: "UDP / Ethernet (1472)", mtu: 1472 },
  { label: "UDP minimum (1280)", mtu: 1280 },
  { label: "LoRa / serial (256)", mtu: 256 },
];

function Bar({
  label,
  bytes,
  total,
  className,
}: {
  label: string;
  bytes: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (bytes / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <div className="w-36 text-fips-muted">{label}</div>
      <div className="relative flex-1 h-5 rounded border border-fips-border bg-fips-bg overflow-hidden">
        <div className={"absolute inset-y-0 left-0 " + className} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 text-right text-fips-text">{bytes}B</div>
    </div>
  );
}

export default function AdapterMtuLab() {
  const [transportMtu, setTransportMtu] = useState(1472);
  const [ipv6PacketSize, setIpv6PacketSize] = useState(1400);

  const effectiveIpv6Mtu = transportMtu - FIPS_IPV6_OVERHEAD;
  const clampedMss = effectiveIpv6Mtu - IPV6_HEADER_BYTES - TCP_HEADER_BYTES;
  const ipv6Capable = transportMtu >= IPV6_MIN_MTU + FIPS_IPV6_OVERHEAD;
  const fits = ipv6PacketSize <= effectiveIpv6Mtu;

  const overheadBreakdown = useMemo(
    () => [
      {
        label: "FIPS envelope",
        bytes: FIPS_BASE_OVERHEAD,
        cls: "bg-fips-accent/40",
      },
      {
        label: "port header (+)",
        bytes: FIPS_IPV6_PORT_HEADER,
        cls: "bg-fips-accent/60",
      },
      {
        label: "IPv6 compression (−)",
        bytes: -FIPS_IPV6_HEADER_SAVINGS,
        cls: "bg-emerald-500/40",
      },
    ],
    []
  );

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="transport-mtu"
            className="text-xs uppercase tracking-wider text-fips-muted"
          >
            Transport MTU
          </label>
          <span className="font-mono text-sm text-fips-text">{transportMtu} B</span>
        </div>
        <input
          id="transport-mtu"
          type="range"
          min={256}
          max={1500}
          value={transportMtu}
          onChange={(e) => setTransportMtu(Number(e.target.value))}
          className="w-full accent-fips-accent"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {TRANSPORT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setTransportMtu(p.mtu)}
              className={
                "text-xs font-mono px-2 py-1 rounded border transition-colors " +
                (transportMtu === p.mtu
                  ? "border-fips-accent bg-fips-accent/10 text-fips-accent"
                  : "border-fips-border text-fips-muted hover:text-fips-text")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="ipv6-packet-size"
            className="text-xs uppercase tracking-wider text-fips-muted"
          >
            Outbound IPv6 packet size
          </label>
          <span className="font-mono text-sm text-fips-text">{ipv6PacketSize} B</span>
        </div>
        <input
          id="ipv6-packet-size"
          type="range"
          min={60}
          max={1500}
          value={ipv6PacketSize}
          onChange={(e) => setIpv6PacketSize(Number(e.target.value))}
          className="w-full accent-fips-accent"
        />
      </div>

      <div className="space-y-1.5">
        <Bar
          label="transport MTU"
          bytes={transportMtu}
          total={Math.max(transportMtu, 1500)}
          className="bg-fips-border"
        />
        {overheadBreakdown.map((o) => (
          <Bar
            key={o.label}
            label={o.label}
            bytes={o.bytes}
            total={Math.max(transportMtu, 1500)}
            className={o.cls}
          />
        ))}
        <Bar
          label="effective IPv6 MTU"
          bytes={Math.max(0, effectiveIpv6Mtu)}
          total={Math.max(transportMtu, 1500)}
          className="bg-fips-accent"
        />
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded border border-fips-border p-3">
          <dt className="text-xs uppercase tracking-wider text-fips-muted mb-1">
            Effective IPv6 MTU
          </dt>
          <dd className="font-mono text-fips-accent">
            {effectiveIpv6Mtu > 0 ? `${effectiveIpv6Mtu} B` : "negative"}
          </dd>
          <p className="text-xs text-fips-muted mt-1">What fips0 advertises to the kernel.</p>
        </div>
        <div className="rounded border border-fips-border p-3">
          <dt className="text-xs uppercase tracking-wider text-fips-muted mb-1">Clamped TCP MSS</dt>
          <dd className="font-mono text-fips-accent">
            {clampedMss > 0 ? `${clampedMss} B` : "too small for TCP"}
          </dd>
          <p className="text-xs text-fips-muted mt-1">
            Rewritten into SYN and SYN-ACK by the adapter.
          </p>
        </div>
        <div className="rounded border border-fips-border p-3">
          <dt className="text-xs uppercase tracking-wider text-fips-muted mb-1">IPv6 viable?</dt>
          <dd className={"font-mono " + (ipv6Capable ? "text-emerald-400" : "text-red-400")}>
            {ipv6Capable ? "yes" : "no"}
          </dd>
          <p className="text-xs text-fips-muted mt-1">
            Needs transport MTU ≥ {IPV6_MIN_MTU + FIPS_IPV6_OVERHEAD} B.
          </p>
        </div>
      </dl>

      <div
        className={
          "rounded border p-3 text-sm " +
          (fits
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-red-500/30 bg-red-500/5 text-red-300")
        }
        aria-live="polite"
      >
        {fits ? (
          <span>
            <span className="font-mono">{ipv6PacketSize}B</span> fits inside the effective IPv6 MTU
            of <span className="font-mono">{effectiveIpv6Mtu}B</span>. Packet goes on the wire
            as-is.
          </span>
        ) : (
          <span>
            <span className="font-mono">{ipv6PacketSize}B</span> exceeds the effective IPv6 MTU (
            <span className="font-mono">{effectiveIpv6Mtu}B</span>). The adapter returns ICMPv6
            Packet Too Big to the sending application (rate-limited to one per 100ms per source).
          </span>
        )}
      </div>
    </div>
  );
}
