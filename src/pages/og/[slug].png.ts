import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  {
    slug: "glossary",
    eyebrow: "Reference",
    title: "Glossary",
    subtitle: "Short, stable definitions of the FIPS vocabulary used throughout the lessons.",
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// During astro build this module lives somewhere under .astro/chunks; the
// repo-root-relative path to our fonts is resolved via process.cwd() which
// points to the project root.
const FONT_DIR = path.resolve(process.cwd(), "src/assets/fonts");
const jbMonoRegular = fs.readFileSync(path.join(FONT_DIR, "JetBrainsMono-Regular.ttf"));
const jbMonoBold = fs.readFileSync(path.join(FONT_DIR, "JetBrainsMono-Bold.ttf"));
// Silence unused warning for __dirname in case tsc ever evaluates it.
void __dirname;

function tree(card: Card): object {
  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        backgroundColor: "#0b0f1a",
        backgroundImage: "linear-gradient(135deg, #0b0f1a 0%, #131929 100%)",
        color: "#e2e8f0",
        fontFamily: "JetBrains Mono",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "18px",
              color: "#22d3ee",
              fontSize: "28px",
              fontWeight: 700,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    border: "3px solid #22d3ee",
                    color: "#22d3ee",
                    fontSize: "22px",
                    fontWeight: 700,
                  },
                  children: "F",
                },
              },
              { type: "div", props: { children: "Learn FIPS" } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "24px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "#22d3ee",
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                  },
                  children: card.eyebrow,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "82px",
                    fontWeight: 700,
                    lineHeight: 1.05,
                    color: "#e2e8f0",
                    maxWidth: "1040px",
                  },
                  children: card.title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "30px",
                    color: "#8896ab",
                    maxWidth: "1000px",
                    lineHeight: 1.35,
                  },
                  children: card.subtitle,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#8896ab",
              fontSize: "22px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    backgroundColor: "#22d3ee",
                  },
                  children: "",
                },
              },
              { type: "div", props: { children: "learn-fips.vercel.app" } },
            ],
          },
        },
      ],
    },
  };
}

async function renderPng(card: Card): Promise<Uint8Array> {
  const svg = await satori(tree(card) as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "JetBrains Mono", data: jbMonoRegular, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: jbMonoBold, weight: 700, style: "normal" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

export function getStaticPaths() {
  return cards.map((card) => ({ params: { slug: card.slug } }));
}

export const GET: APIRoute = async ({ params }) => {
  const card = cards.find((c) => c.slug === params.slug);
  if (!card) return new Response("not found", { status: 404 });
  const png = await renderPng(card);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
