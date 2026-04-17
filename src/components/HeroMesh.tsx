import { useEffect, useRef } from "react";

interface MeshNode {
  baseX: number;
  baseY: number;
  phase: number;
  amp: number;
  speed: number;
  size: number;
}

const ACCENT = "34, 211, 238";
const CORE = "186, 244, 255";

export default function HeroMesh() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = mediaQuery.matches;

    let width = 0;
    let height = 0;
    let nodes: MeshNode[] = [];
    let edges: Array<{ a: number; b: number; alpha: number }> = [];
    let rafId: number | null = null;
    const t0 = performance.now();
    const mouse = { x: -9999, y: -9999, active: false };

    function rebuild() {
      const area = width * height;
      const count = Math.max(70, Math.min(200, Math.round(area / 4200)));
      const cx = width * 0.42;
      const cy = height * 0.55;
      const spread = Math.min(width, height) * 0.55;

      nodes = [];
      for (let i = 0; i < count; i++) {
        // Gaussian falloff for dense cluster, with a few scattered satellites.
        const u = Math.random();
        const v = Math.random();
        const g = Math.sqrt(-2 * Math.log(u || 1e-6)) * Math.cos(2 * Math.PI * v);
        const angle = Math.random() * Math.PI * 2;
        const isSatellite = Math.random() < 0.12;
        const r = isSatellite ? spread * (0.7 + Math.random() * 0.9) : Math.abs(g) * spread * 0.42;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.78;

        nodes.push({
          baseX: x,
          baseY: y,
          phase: Math.random() * Math.PI * 2,
          amp: 1.5 + Math.random() * 5,
          speed: 0.12 + Math.random() * 0.35,
          size: 0.9 + Math.random() * 1.4,
        });
      }

      // K nearest neighbours within a max radius, deduped by (min,max).
      edges = [];
      const K = 3;
      const maxDist = Math.min(width, height) * 0.17;
      const seen = new Set<number>();
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        const cands: Array<{ j: number; d: number }> = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j]!;
          const dx = a.baseX - b.baseX;
          const dy = a.baseY - b.baseY;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) cands.push({ j, d });
        }
        cands.sort((p, q) => p.d - q.d);
        const limit = Math.min(K, cands.length);
        for (let k = 0; k < limit; k++) {
          const { j, d } = cands[k]!;
          const lo = Math.min(i, j);
          const hi = Math.max(i, j);
          const key = lo * 100000 + hi;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({ a: lo, b: hi, alpha: 1 - d / maxDist });
        }
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }

    function draw() {
      const now = performance.now();
      const t = (now - t0) / 1000;
      ctx!.clearRect(0, 0, width, height);

      const mouseR = Math.min(width, height) * 0.22;
      const positions = new Array<{ x: number; y: number; boost: number }>(nodes.length);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        let x = n.baseX;
        let y = n.baseY;
        if (!reduceMotion) {
          x += Math.cos(t * n.speed + n.phase) * n.amp;
          y += Math.sin(t * n.speed * 1.13 + n.phase) * n.amp * 0.75;
        }
        let boost = 0;
        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < mouseR) {
            const f = 1 - d / mouseR;
            const push = f * f * 18;
            const invD = d > 0.001 ? 1 / d : 0;
            x += dx * invD * push;
            y += dy * invD * push;
            boost = f;
          }
        }
        positions[i] = { x, y, boost };
      }

      // Edges first, nodes on top.
      for (let e = 0; e < edges.length; e++) {
        const { a, b, alpha } = edges[e]!;
        const pa = positions[a]!;
        const pb = positions[b]!;
        const boost = Math.max(pa.boost, pb.boost);
        const aa = Math.min(0.75, alpha * 0.45 + boost * 0.5);
        ctx!.strokeStyle = `rgba(${ACCENT}, ${aa})`;
        ctx!.lineWidth = 0.8 + boost * 0.8;
        ctx!.beginPath();
        ctx!.moveTo(pa.x, pa.y);
        ctx!.lineTo(pb.x, pb.y);
        ctx!.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const p = positions[i]!;
        const n = nodes[i]!;
        const r = n.size * 1.3 + p.boost * 2.4;
        const glowR = r * 4.5;
        const glowA = 0.28 + p.boost * 0.55;
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grad.addColorStop(0, `rgba(${ACCENT}, ${glowA})`);
        grad.addColorStop(1, `rgba(${ACCENT}, 0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = `rgba(${CORE}, ${0.9})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Only consider activity when the pointer is over (or near) the hero canvas.
      if (x < -40 || y < -40 || x > rect.width + 40 || y > rect.height + 40) {
        mouse.active = false;
        return;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
    }

    function onMotionChange(ev: MediaQueryListEvent) {
      reduceMotion = ev.matches;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    rafId = requestAnimationFrame(draw);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onMotionChange);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onMotionChange);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none"
    />
  );
}
