import { codeLinks, type CodeLink } from "../data/codeLinks";

/**
 * Client-side enhancer. On every page load (including Astro view
 * transitions), walk every `<code>` element inside an `<article>` and wrap
 * occurrences of known FIPS symbols in a link to the upstream source,
 * pinned to a specific commit. CSS handles the hover affordance; the
 * parentheses after `foo()` stay as plain text so the code still looks
 * like code.
 */

function escape(literal: string): string {
  return literal.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function compile(): { regex: RegExp; lookup: Map<string, CodeLink> } | null {
  if (codeLinks.length === 0) return null;
  const lookup = new Map<string, CodeLink>();
  for (const entry of codeLinks) {
    if (!lookup.has(entry.symbol)) lookup.set(entry.symbol, entry);
  }
  // Longest first so compound identifiers win over their prefixes.
  const literals = Array.from(lookup.keys()).sort((a, b) => b.length - a.length);
  return {
    regex: new RegExp(`\\b(?:${literals.map(escape).join("|")})\\b`, "g"),
    lookup,
  };
}

function isInsideLink(node: Node): boolean {
  let el: Element | null = node.parentElement;
  while (el) {
    if (el.tagName === "A") return true;
    el = el.parentElement;
  }
  return false;
}

function decorateCodeEl(code: Element, regex: RegExp, lookup: Map<string, CodeLink>) {
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      if (isInsideLink(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) textNodes.push(current as Text);

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? "";
    regex.lastIndex = 0;
    const matches: { start: number; end: number; entry: CodeLink }[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      const entry = lookup.get(m[0]);
      if (!entry) continue;
      matches.push({ start: m.index, end: m.index + m[0].length, entry });
    }
    if (matches.length === 0) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const { start, end, entry } of matches) {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      const a = document.createElement("a");
      a.className = "code-link";
      a.href = entry.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = text.slice(start, end);
      a.setAttribute("data-tooltip", entry.label);
      a.setAttribute("aria-label", `${entry.symbol}: ${entry.label}. Opens source on GitHub.`);
      frag.appendChild(a);
      cursor = end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
}

export function decorateCodeLinks() {
  const compiled = compile();
  if (!compiled) return;
  document.querySelectorAll("article code").forEach((code) => {
    decorateCodeEl(code, compiled.regex, compiled.lookup);
  });
}
