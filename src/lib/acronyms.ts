import { glossary, type GlossaryTerm } from "../data/glossary";

/**
 * Client-side enhancer. On every page load (including Astro view
 * transitions), walk the prose inside every <article> and wrap bare
 * acronyms in a link to the glossary. CSS handles the hover tooltip;
 * tapping the link on mobile just navigates to the glossary entry.
 */

type Match = { entry: GlossaryTerm; literal: string };

const SKIP_TAGS = new Set([
  "A",
  "ABBR",
  "BUTTON",
  "CODE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "INPUT",
  "KBD",
  "LABEL",
  "PRE",
  "SCRIPT",
  "SELECT",
  "STYLE",
  "TEXTAREA",
]);

function compile(): { regex: RegExp; lookup: Map<string, GlossaryTerm> } | null {
  const lookup = new Map<string, GlossaryTerm>();
  for (const term of glossary) {
    if (!term.acronyms) continue;
    for (const a of term.acronyms) if (!lookup.has(a)) lookup.set(a, term);
  }
  if (lookup.size === 0) return null;
  // Longest first so "Noise IK" wins over "IK".
  const literals = Array.from(lookup.keys()).sort((a, b) => b.length - a.length);
  const escaped = literals.map((s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  return {
    regex: new RegExp(`\\b(?:${escaped.join("|")})\\b`, "g"),
    lookup,
  };
}

function shouldSkip(node: Node, root: Element): boolean {
  let el: Element | null = node.parentElement;
  while (el && el !== root.parentElement) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.classList && (el.classList.contains("mono") || el.classList.contains("acronym"))) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function decorateRoot(root: Element, regex: RegExp, lookup: Map<string, GlossaryTerm>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(node, root)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) textNodes.push(current as Text);

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? "";
    regex.lastIndex = 0;
    const matches: { start: number; end: number; match: Match }[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      const entry = lookup.get(m[0]);
      if (!entry) continue;
      matches.push({ start: m.index, end: m.index + m[0].length, match: { entry, literal: m[0] } });
    }
    if (matches.length === 0) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const { start, end, match } of matches) {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      const a = document.createElement("a");
      a.className = "acronym";
      a.href = `/glossary#${match.entry.id}`;
      a.textContent = match.literal;
      const tip = match.entry.expansion ?? match.entry.summary;
      a.setAttribute("data-tooltip", tip);
      a.setAttribute("aria-label", `${match.literal}: ${tip}. Opens glossary.`);
      frag.appendChild(a);
      cursor = end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
}

export function decorateAcronyms() {
  // The glossary page already shows every expansion; no need to double up.
  if (location.pathname.startsWith("/glossary")) return;
  const compiled = compile();
  if (!compiled) return;
  document.querySelectorAll("article").forEach((el) => {
    decorateRoot(el, compiled.regex, compiled.lookup);
  });
}
