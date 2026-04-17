import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const STEP_DURATION_MS = 1800;

interface JourneyStep {
  title: string;
  description: string;
  layers: LayerState[];
  nodeHighlight: number; // which node is active (-1 for none)
  linkHighlight: number; // which link segment (0=A-B, 1=B-C, 2=C-D, -1=none)
}

interface LayerState {
  name: string;
  color: string;
  active: boolean;
}

const nodes = [
  { label: "A", x: 60, transport: "WiFi" },
  { label: "B", x: 230, transport: "Ethernet" },
  { label: "C", x: 400, transport: "UDP" },
  { label: "D", x: 570, transport: "" },
];

const steps: JourneyStep[] = [
  {
    title: "Application sends payload",
    description: "App on node A sends data to node D. Raw payload is handed to FSP.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: true },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: false },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: false },
    ],
    nodeHighlight: 0,
    linkHighlight: -1,
  },
  {
    title: "FSP wraps in session encryption",
    description:
      "Noise XK encrypts the payload for node D. Only D can decrypt this layer. The session header carries a replay counter.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: false },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: true },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: false },
    ],
    nodeHighlight: 0,
    linkHighlight: -1,
  },
  {
    title: "FMP wraps in link encryption for A→B",
    description:
      "Noise IK encrypts the entire FSP frame for the first hop. The outer header carries src/dest node_addrs for routing. Transport: WiFi.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: false },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: false },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: true },
    ],
    nodeHighlight: 0,
    linkHighlight: 0,
  },
  {
    title: "B receives: strip FMP, read routing header",
    description:
      "Node B decrypts the link layer. It reads the destination node_addr from the routing header. D is not a direct peer, so B forwards. The FSP layer remains untouched (B cannot decrypt it).",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: false },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: false },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: true },
    ],
    nodeHighlight: 1,
    linkHighlight: -1,
  },
  {
    title: "B re-wraps FMP for B→C",
    description:
      "New link-layer encryption for the next hop. Different Noise IK session, different keys. Transport switches from WiFi to Ethernet.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: false },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: false },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: true },
    ],
    nodeHighlight: 1,
    linkHighlight: 1,
  },
  {
    title: "C receives: strip FMP, re-wrap for C→D",
    description:
      "Same process. C decrypts the B→C link layer, reads the routing header, and re-encrypts for C→D. Transport: UDP overlay.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: false },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: false },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: true },
    ],
    nodeHighlight: 2,
    linkHighlight: 2,
  },
  {
    title: "D receives: strip FMP, strip FSP, deliver payload",
    description:
      "Node D decrypts the link layer (FMP) and recognizes itself as the destination. Then it decrypts the session layer (FSP) using its Noise XK session with A. The original payload is recovered.",
    layers: [
      { name: "Payload", color: "#8b5cf6", active: true },
      { name: "FSP (end-to-end)", color: "#3b82f6", active: true },
      { name: "FMP (hop-by-hop)", color: "#22c55e", active: true },
    ],
    nodeHighlight: 3,
    linkHighlight: -1,
  },
];

export default function PacketJourney() {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduceMotion = useReducedMotion();
  const timer = useRef<number | null>(null);

  const step = steps[stepIdx]!;

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function play() {
    if (playing) return;
    setPlaying(true);
    setStepIdx(0);
    let i = 0;
    const tick = () => {
      i++;
      if (i >= steps.length) {
        setPlaying(false);
        timer.current = null;
        return;
      }
      setStepIdx(i);
      timer.current = window.setTimeout(tick, STEP_DURATION_MS);
    };
    timer.current = window.setTimeout(tick, 400);
  }

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-4">
      <h3 className="text-lg font-semibold mb-4">Packet Journey: A → D</h3>

      {/* SVG network diagram */}
      <div className="overflow-x-auto mb-4">
        <svg viewBox="0 0 630 120" className="w-full max-w-[630px]" style={{ minWidth: 400 }}>
          {/* Links */}
          {[0, 1, 2].map((i) => {
            const active = step.linkHighlight === i;
            const a = nodes[i]!;
            const b = nodes[i + 1]!;
            return (
              <line
                key={i}
                x1={a.x}
                y1={50}
                x2={b.x}
                y2={50}
                stroke={active ? "#f59e0b" : "#1e2a3a"}
                strokeWidth={active ? 3 : 1.5}
              />
            );
          })}

          {/* Transport labels */}
          {[0, 1, 2].map((i) => {
            const a = nodes[i]!;
            const b = nodes[i + 1]!;
            return (
              <text
                key={`t-${i}`}
                x={(a.x + b.x) / 2}
                y={30}
                textAnchor="middle"
                fill="#8896ab"
                fontSize="10"
                fontFamily="monospace"
              >
                {a.transport}
              </text>
            );
          })}

          {/* Packet indicator */}
          {step.linkHighlight >= 0 && (
            <motion.circle
              key={stepIdx}
              initial={{ cx: nodes[step.linkHighlight]!.x, cy: 50 }}
              animate={{ cx: nodes[step.linkHighlight + 1]!.x, cy: 50 }}
              transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
              r={6}
              fill="#f59e0b"
              opacity={0.9}
            />
          )}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const active = step.nodeHighlight === i;
            return (
              <g key={n.label}>
                <circle
                  cx={n.x}
                  cy={50}
                  r={22}
                  fill={active ? "#1e2a3a" : "#131929"}
                  stroke={active ? "#22d3ee" : "#2d3a4f"}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <text
                  x={n.x}
                  y={54}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  {n.label}
                </text>
                <text
                  x={n.x}
                  y={86}
                  textAnchor="middle"
                  fill="#8896ab"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {i === 0 ? "source" : i === 3 ? "destination" : "transit"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Layer visualization */}
      <div className="flex gap-2 mb-4 justify-center">
        {step.layers.map((layer) => (
          <div
            key={layer.name}
            className="px-3 py-1.5 rounded text-xs font-mono transition-all"
            style={{
              backgroundColor: layer.active ? layer.color + "20" : "transparent",
              borderWidth: 1,
              borderColor: layer.active ? layer.color : "#1e2a3a",
              color: layer.active ? layer.color : "#8896ab",
            }}
          >
            {layer.name}
          </div>
        ))}
      </div>

      {/* Step info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded border border-fips-border p-3 mb-4"
        >
          <p className="font-semibold text-sm mb-1">
            <span className="text-fips-accent font-mono">
              Step {stepIdx + 1}/{steps.length}:
            </span>{" "}
            {step.title}
          </p>
          <p className="text-sm text-fips-muted">{step.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => !playing && setStepIdx(Math.max(0, stepIdx - 1))}
          disabled={playing || stepIdx === 0}
          className="px-3 py-1 rounded border border-fips-border text-fips-muted disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={() => !playing && setStepIdx(Math.min(steps.length - 1, stepIdx + 1))}
          disabled={playing || stepIdx >= steps.length - 1}
          className="px-3 py-1 rounded border border-fips-border text-fips-accent disabled:opacity-30"
        >
          Next →
        </button>
        <button
          onClick={play}
          disabled={playing}
          className="px-3 py-1 rounded bg-fips-accent text-fips-bg font-semibold disabled:opacity-40"
        >
          {playing ? "Playing..." : "▶ Play"}
        </button>
      </div>
    </div>
  );
}
