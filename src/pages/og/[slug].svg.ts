import type { APIRoute } from "astro";
import { lessons } from "../../data/lessons";

interface Card {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

const cards: Card[] = [
  {
    slug: "default",
    eyebrow: "Interactive Protocol Guide",
    title: "Learn FIPS",
    subtitle: "A self-organizing encrypted mesh, taught layer by layer.",
  },
  ...lessons.map<Card>((l) => ({
    slug: l.slug,
    eyebrow: `Lesson ${l.number}`,
    title: l.title,
    subtitle: l.description,
  })),
];

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (words.join(" ").length > lines.join(" ").length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = last.replace(/\s+\S+$/, "") + "…";
  }
  return lines;
}

function render(card: Card): string {
  const subtitleLines = wrap(card.subtitle, 58, 3);
  const subtitleText = subtitleLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 44}">${escape(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f1a"/>
      <stop offset="100%" stop-color="#131929"/>
    </linearGradient>
    <pattern id="hex" width="56" height="98" patternUnits="userSpaceOnUse">
      <path d="M28 2 53 16v28L28 58 3 44V16z" fill="none" stroke="#1e2a3a" stroke-width="1" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#hex)"/>
  <g transform="translate(80, 90)">
    <path d="M30 4 55 18v28L30 60 5 46V18z" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="30" cy="32" r="5" fill="#22d3ee"/>
    <text x="80" y="42" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24" font-weight="600" fill="#22d3ee">Learn FIPS</text>
  </g>
  <text x="80" y="230" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="600" fill="#22d3ee" letter-spacing="4">${escape(card.eyebrow.toUpperCase())}</text>
  <text x="80" y="320" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="78" font-weight="700" fill="#e2e8f0">${escape(card.title)}</text>
  <text x="80" y="420" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="400" fill="#8896ab">${subtitleText}</text>
  <g transform="translate(80, 560)">
    <circle cx="6" cy="0" r="4" fill="#22d3ee"/>
    <text x="22" y="6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" fill="#8896ab">learn-fips.vercel.app</text>
  </g>
</svg>`;
}

export function getStaticPaths() {
  return cards.map((card) => ({ params: { slug: card.slug } }));
}

export const GET: APIRoute = ({ params }) => {
  const card = cards.find((c) => c.slug === params.slug);
  if (!card) return new Response("not found", { status: 404 });
  return new Response(render(card), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
