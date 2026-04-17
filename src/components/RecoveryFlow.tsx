import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Visualizes the FIPS coordinate-warmup state machine and the three
 * error-recovery paths from fips-session-layer.md and fips-mesh-operation.md:
 *
 *   - CoordsRequired : a transit router has no cached coordinates for dest.
 *   - PathBroken     : a transit router has coords but no closer neighbor.
 *   - MtuExceeded    : the packet is too large for the next-hop link.
 *
 * The user picks a scenario, steps through it, and watches the cache state
 * and warmup counter react. There is nothing random here; each scenario is
 * a fixed script of annotated steps.
 */

type CacheState = "warm" | "cold" | "stale";

interface RouterState {
  label: string;
  cache: CacheState;
  /** non-null while a packet is sitting at this node, indicating its type. */
  held: PacketKind | null;
}

type PacketKind =
  | { kind: "data"; cp: boolean }
  | { kind: "data-big"; cp: boolean }
  | { kind: "err-coords" }
  | { kind: "err-path" }
  | { kind: "err-mtu" }
  | { kind: "warmup" }
  | { kind: "lookup-req" }
  | { kind: "lookup-resp" };

interface Frame {
  /** 0..4, which node currently "owns" the frame visually. -1 = none. */
  activeNode: number;
  /** Router state after this frame is applied. */
  routers: RouterState[];
  /** Warmup counter at the source after this frame. */
  cpRemaining: number;
  /** Short title for the frame. */
  title: string;
  /** Longer description displayed under the diagram. */
  detail: string;
  /** Optional: highlight "travel" between two nodes. */
  link?: { from: number; to: number; packet: PacketKind };
}

type ScenarioId = "coords-required" | "path-broken" | "mtu-exceeded";

const N_WARMUP = 5;

const scenarios: Record<ScenarioId, { title: string; summary: string; frames: Frame[] }> = {
  "coords-required": {
    title: "CoordsRequired",
    summary:
      "Warmup has finished. A transit router lost the destination's coordinates (cache expired, or the router just joined). It has no way to forward the packet.",
    frames: buildCoordsRequired(),
  },
  "path-broken": {
    title: "PathBroken",
    summary:
      "Warmup has finished. A transit router still has coordinates, but no neighbor is closer to the destination. The cached coordinates are stale.",
    frames: buildPathBroken(),
  },
  "mtu-exceeded": {
    title: "MtuExceeded",
    summary:
      "The source sends a packet that fits its current path-MTU estimate. A transit link further down has a smaller MTU and cannot forward the packet.",
    frames: buildMtuExceeded(),
  },
};

function startingRouters(warm: boolean): RouterState[] {
  return [
    { label: "Src", cache: "warm", held: null },
    { label: "R1", cache: warm ? "warm" : "cold", held: null },
    { label: "R2", cache: warm ? "warm" : "cold", held: null },
    { label: "R3", cache: warm ? "warm" : "cold", held: null },
    { label: "Dst", cache: "warm", held: null },
  ];
}

function setCache(r: RouterState[], idx: number, c: CacheState): RouterState[] {
  return r.map((rt, i) => (i === idx ? { ...rt, cache: c } : rt));
}

function buildCoordsRequired(): Frame[] {
  const frames: Frame[] = [];
  let routers = startingRouters(true);
  routers = setCache(routers, 2, "cold");

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "Steady state, then R2 drops its cache",
    detail:
      "The session has been running. Warmup is done (CP counter is 0). R2's coordinate cache for Dst has just expired. R2 still has all its FMP link sessions, it just no longer knows where Dst sits in the tree.",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "Src sends a normal data packet",
    detail:
      "A minimal SessionDatagram: 12-byte FSP header, ciphertext, no coordinates attached. The source believes the path is still warm.",
    link: { from: 0, to: 1, packet: { kind: "data", cp: false } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "R1 forwards from cache",
    detail: "R1 has a warm cache entry for Dst. Normal greedy/bloom lookup picks R2 as next hop.",
    link: { from: 1, to: 2, packet: { kind: "data", cp: false } },
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 cannot forward",
    detail:
      "R2 tries find_next_hop(dest): no coordinates in cache, so it returns None immediately. The original packet is dropped. R2 now has to signal the source.",
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 emits CoordsRequired back to Src",
    detail:
      "A new SessionDatagram addressed to the original source, payload = CoordsRequired (0x15). R2 routes it via find_next_hop(src_addr). Transit-side rate limit: at most one per destination per 100ms.",
    link: { from: 2, to: 1, packet: { kind: "err-coords" } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "Error returns to Src",
    detail:
      "R1 forwards the error toward Src. The session context is untouched: only the routing view changes.",
    link: { from: 1, to: 0, packet: { kind: "err-coords" } },
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: N_WARMUP,
    title: "Src reacts: warmup counter resets to " + N_WARMUP,
    detail:
      "FSP receives the CoordsRequired signal. It arms the warmup counter at " +
      N_WARMUP +
      " and schedules a standalone CoordsWarmup, rate-limited to one per 2000ms per destination. Discovery (LookupRequest) is optional for CoordsRequired and mandatory for PathBroken.",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: N_WARMUP,
    title: "Src sends a standalone CoordsWarmup",
    detail:
      "CoordsWarmup (0x14) is an encrypted FSP message with CP set and empty inner body. It exists only to deliver cleartext coordinates to transit nodes.",
    link: { from: 0, to: 1, packet: { kind: "warmup" } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: N_WARMUP,
    title: "R1 refreshes its cache",
    detail: "R1 already had an entry; the cleartext coordinates refresh the TTL.",
    link: { from: 1, to: 2, packet: { kind: "warmup" } },
  });

  routers = setCache(routers, 2, "warm");
  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: N_WARMUP,
    title: "R2 caches Src and Dst coordinates",
    detail: "try_warm_coord_cache() stores both ends. R2 can now forward to Dst again.",
    link: { from: 2, to: 3, packet: { kind: "warmup" } },
  });

  frames.push({
    activeNode: 3,
    routers,
    cpRemaining: N_WARMUP,
    title: "R3 forwards to Dst",
    detail:
      "R3 had a warm cache. The CoordsWarmup reaches Dst, which receives the empty inner body and silently discards it. The path is re-warmed end-to-end.",
    link: { from: 3, to: 4, packet: { kind: "warmup" } },
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: Math.max(0, N_WARMUP - 1),
    title: "Next data packet goes out with CP set",
    detail:
      "The warmup counter is still above zero, so FSP adds cleartext coordinates. Every transit router reinforces its cache on the way through. The counter decrements.",
    link: { from: 0, to: 1, packet: { kind: "data", cp: true } },
  });

  return frames;
}

function buildPathBroken(): Frame[] {
  const frames: Frame[] = [];
  let routers = startingRouters(true);
  routers = setCache(routers, 2, "stale");

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "Steady state, with R2 holding stale coords",
    detail:
      "A tree reconvergence moved Dst. R2 still has coordinates for Dst, but they point at a tree position Dst no longer occupies.",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "Src sends a normal data packet",
    detail: "Minimal SessionDatagram, no CP flag. Src has no reason to suspect trouble yet.",
    link: { from: 0, to: 1, packet: { kind: "data", cp: false } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "R1 forwards to R2",
    detail: "R1's cache is fresh. Greedy lookup picks R2.",
    link: { from: 1, to: 2, packet: { kind: "data", cp: false } },
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 is the dead end",
    detail:
      "R2 has coordinates, but when it runs greedy routing, no peer is closer to Dst than itself. find_next_hop returns None. The cached entry was stale.",
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 emits PathBroken back to Src",
    detail:
      "Same message format as CoordsRequired, different payload (0x16). R2 does not flush its stale entry by itself; it just tells the source.",
    link: { from: 2, to: 1, packet: { kind: "err-path" } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "Error returns to Src",
    detail: "R1 forwards the error back. Session keys are untouched.",
    link: { from: 1, to: 0, packet: { kind: "err-path" } },
  });

  routers = setCache(routers, 0, "cold");
  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: N_WARMUP,
    title: "Src removes its own stale entry and resets warmup",
    detail:
      "PathBroken means 'your coordinates for Dst may be wrong'. FSP deletes its local entry, resets the CP counter to " +
      N_WARMUP +
      ", and always initiates LookupRequest (unlike CoordsRequired, where discovery is optional).",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: N_WARMUP,
    title: "Src emits a bloom-guided LookupRequest",
    detail:
      "The request walks the tree using bloom filters. Once a node that knows Dst's new coordinates replies, the LookupResponse rides the reverse path back.",
    link: { from: 0, to: 1, packet: { kind: "lookup-req" } },
  });

  routers = setCache(routers, 2, "warm");
  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: N_WARMUP,
    title: "LookupResponse arrives, caches refresh",
    detail:
      "The response carries the current coordinates. Transit routers on the reverse path cache them as they relay. The warmup counter is reset again to cover the timing gap between the first reset and the response.",
    link: { from: 2, to: 0, packet: { kind: "lookup-resp" } },
  });

  frames.push({
    activeNode: 0,
    routers: setCache(routers, 0, "warm"),
    cpRemaining: N_WARMUP - 1,
    title: "Data resumes with CP set",
    detail:
      "Same pattern as after CoordsRequired: the next data packet carries cleartext coordinates and refreshes every cache along the way.",
    link: { from: 0, to: 1, packet: { kind: "data", cp: true } },
  });

  return frames;
}

function buildMtuExceeded(): Frame[] {
  const frames: Frame[] = [];
  const routers = startingRouters(true);

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "Steady state; Src thinks path MTU is large",
    detail:
      "The session's path_mtu estimate is higher than one of the downstream links actually supports. Nothing has told Src yet.",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "Src sends a full-sized SessionDatagram",
    detail: "Payload + headers fills the session's current MTU estimate.",
    link: { from: 0, to: 1, packet: { kind: "data-big", cp: false } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "R1 forwards toward R2",
    detail: "R1's link to R2 accepts packets of this size. R1 relays as usual.",
    link: { from: 1, to: 2, packet: { kind: "data-big", cp: false } },
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 cannot fit the packet onto its link to R3",
    detail:
      "The next-hop link's MTU is smaller than the packet. The mesh layer does not fragment. R2 drops the packet and emits MtuExceeded instead.",
  });

  frames.push({
    activeNode: 2,
    routers,
    cpRemaining: 0,
    title: "R2 emits MtuExceeded back to Src",
    detail:
      "Payload names the destination, the reporting router, and the bottleneck MTU. Same rate limit as the other signals: one per destination per 100ms.",
    link: { from: 2, to: 1, packet: { kind: "err-mtu" } },
  });

  frames.push({
    activeNode: 1,
    routers,
    cpRemaining: 0,
    title: "Error returns to Src",
    detail: "R1 relays it home.",
    link: { from: 1, to: 0, packet: { kind: "err-mtu" } },
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "FSP lowers its path-MTU estimate",
    detail:
      "No discovery, no warmup. The session just clamps path_mtu to the reported bottleneck. Future packets are sized to fit. MtuExceeded is the reactive complement to the path_mtu field the mesh layer already advertises in SessionDatagram and LookupResponse.",
  });

  frames.push({
    activeNode: 0,
    routers,
    cpRemaining: 0,
    title: "Src resends with a smaller payload",
    detail:
      "The same application data may now span more FSP packets, but each one fits the reported MTU.",
    link: { from: 0, to: 1, packet: { kind: "data", cp: false } },
  });

  return frames;
}

function packetColor(p: PacketKind): string {
  switch (p.kind) {
    case "data":
      return p.cp ? "#22d3ee" : "#f59e0b";
    case "data-big":
      return "#f59e0b";
    case "err-coords":
      return "#ef4444";
    case "err-path":
      return "#ef4444";
    case "err-mtu":
      return "#ef4444";
    case "warmup":
      return "#22d3ee";
    case "lookup-req":
      return "#a78bfa";
    case "lookup-resp":
      return "#a78bfa";
  }
}

function packetLabel(p: PacketKind): string {
  switch (p.kind) {
    case "data":
      return p.cp ? "data (CP)" : "data";
    case "data-big":
      return "data (big)";
    case "err-coords":
      return "CoordsRequired";
    case "err-path":
      return "PathBroken";
    case "err-mtu":
      return "MtuExceeded";
    case "warmup":
      return "CoordsWarmup";
    case "lookup-req":
      return "LookupRequest";
    case "lookup-resp":
      return "LookupResponse";
  }
}

function cacheColor(c: CacheState): string {
  if (c === "warm") return "#22c55e";
  if (c === "stale") return "#f59e0b";
  return "#6b7280";
}

const NODES_X = [60, 180, 300, 420, 540];

export default function RecoveryFlow() {
  const [scenario, setScenario] = useState<ScenarioId>("coords-required");
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduceMotion = useReducedMotion();
  const timer = useRef<number | null>(null);

  const frames = scenarios[scenario].frames;
  const frame = frames[frameIdx] ?? frames[0]!;

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const play = () => {
    if (playing) return;
    setPlaying(true);
    let i = 0;
    setFrameIdx(0);
    const step = () => {
      i += 1;
      if (i >= frames.length) {
        setPlaying(false);
        timer.current = null;
        return;
      }
      setFrameIdx(i);
      timer.current = window.setTimeout(step, reduceMotion ? 0 : 1800);
    };
    timer.current = window.setTimeout(step, reduceMotion ? 0 : 1500);
  };

  const reset = () => {
    stop();
    setFrameIdx(0);
  };

  const pickScenario = (id: ScenarioId) => {
    stop();
    setScenario(id);
    setFrameIdx(0);
  };

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(scenarios) as ScenarioId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pickScenario(id)}
            aria-pressed={scenario === id}
            className={
              scenario === id
                ? "px-3 py-1 rounded border border-fips-accent bg-fips-accent/10 text-fips-accent text-xs font-mono"
                : "px-3 py-1 rounded border border-fips-border text-fips-muted hover:text-fips-text text-xs font-mono"
            }
          >
            {scenarios[id].title}
          </button>
        ))}
      </div>

      <p className="text-sm text-fips-muted mb-3">{scenarios[scenario].summary}</p>

      <div className="flex items-center gap-4 mb-2 text-xs font-mono">
        <span>
          <span className="text-fips-muted">CP counter:</span>{" "}
          <span className="text-fips-accent">
            {frame.cpRemaining} / {N_WARMUP}
          </span>
        </span>
        <span className="text-fips-muted">
          frame {frameIdx + 1} / {frames.length}
        </span>
      </div>

      <div className="bg-fips-bg rounded p-2 mb-4 overflow-x-auto">
        <svg
          viewBox="0 0 600 150"
          className="w-full h-auto"
          role="img"
          aria-label={`Recovery diagram, frame ${frameIdx + 1} of ${frames.length}: ${frame.title}`}
        >
          <title>{frame.title}</title>
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={NODES_X[i]}
              y1={70}
              x2={NODES_X[i + 1]}
              y2={70}
              stroke="#1e2a3a"
              strokeWidth={1.5}
            />
          ))}

          {frame.link && (
            <>
              <motion.circle
                key={`${scenario}-${frameIdx}`}
                initial={{ cx: NODES_X[frame.link.from], cy: 70 }}
                animate={{ cx: NODES_X[frame.link.to], cy: 70 }}
                transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
                r={frame.link.packet.kind === "data-big" ? 9 : 6}
                fill={packetColor(frame.link.packet)}
                opacity={0.95}
              />
              <motion.text
                key={`lbl-${scenario}-${frameIdx}`}
                initial={{
                  x: NODES_X[frame.link.from]! + 8,
                  y: 58,
                }}
                animate={{
                  x: NODES_X[frame.link.to]! + 8,
                  y: 58,
                }}
                transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
                fill={packetColor(frame.link.packet)}
                fontSize="10"
                fontFamily="monospace"
              >
                {packetLabel(frame.link.packet)}
              </motion.text>
            </>
          )}

          {frame.routers.map((r, i) => {
            const isActive = frame.activeNode === i;
            return (
              <g key={r.label}>
                <circle
                  cx={NODES_X[i]}
                  cy={70}
                  r={22}
                  fill={isActive ? "#1e2a3a" : "#131929"}
                  stroke={isActive ? "#22d3ee" : "#2d3a4f"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <text
                  x={NODES_X[i]}
                  y={74}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {r.label}
                </text>
                <rect
                  x={NODES_X[i]! - 18}
                  y={104}
                  width={36}
                  height={14}
                  rx={3}
                  fill={cacheColor(r.cache) + "22"}
                  stroke={cacheColor(r.cache)}
                  strokeWidth={1}
                />
                <text
                  x={NODES_X[i]}
                  y={114}
                  textAnchor="middle"
                  fill={cacheColor(r.cache)}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {r.cache}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${scenario}-${frameIdx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="rounded border border-fips-border p-3 mb-4"
          aria-live="polite"
        >
          <p className="font-semibold text-sm mb-1 text-fips-accent">{frame.title}</p>
          <p className="text-sm text-fips-muted">{frame.detail}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => !playing && setFrameIdx(Math.max(0, frameIdx - 1))}
          disabled={playing || frameIdx === 0}
          className="px-3 py-1 rounded border border-fips-border text-fips-muted disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => !playing && setFrameIdx(Math.min(frames.length - 1, frameIdx + 1))}
          disabled={playing || frameIdx >= frames.length - 1}
          className="px-3 py-1 rounded border border-fips-border text-fips-accent disabled:opacity-30"
        >
          Next →
        </button>
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="px-3 py-1 rounded bg-fips-accent text-fips-bg font-semibold disabled:opacity-40"
        >
          {playing ? "Playing…" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1 rounded border border-fips-border text-fips-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
