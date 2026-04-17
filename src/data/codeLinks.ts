/**
 * Source-of-truth links for FIPS code symbols referenced in the lessons.
 *
 * Every entry maps a literal identifier (function, method, type, binary, etc.)
 * to a GitHub code search scoped to the upstream repo. Search survives
 * refactors and file moves, which pinned permalinks do not.
 *
 * To add a symbol: just add an entry below with the exact token as it appears
 * inside `<code>` in the lessons. Keep the list curated — only symbols that
 * actually show up in prose are worth mapping.
 */

const REPO = "jmcorgan/fips";

/**
 * GitHub code search scoped to the upstream FIPS repo. The symbol is wrapped
 * in quotes so multi-word phrases stay intact; single identifiers are
 * unaffected.
 */
function fipsSearch(symbol: string): string {
  const q = encodeURIComponent(`repo:${REPO} "${symbol}"`);
  return `https://github.com/search?q=${q}&type=code`;
}

export interface CodeLink {
  /** The literal token as it appears in prose, e.g. "find_next_hop". */
  symbol: string;
  /** GitHub code search URL scoped to the upstream repo. */
  url: string;
  /** Short hover label. Kept short; the code font signals "this is code". */
  label: string;
}

function link(symbol: string): CodeLink {
  return {
    symbol,
    url: fipsSearch(symbol),
    label: `${symbol} in jmcorgan/fips (GitHub code search)`,
  };
}

/**
 * Symbol → search link. Ordered roughly by where each symbol first appears in
 * the lessons, for easy cross-reference when editing.
 *
 * Literals MUST match the token as written in prose. When a symbol can show
 * up with or without parentheses, register the bare identifier; the decorator
 * uses word boundaries, so `find_next_hop` matches both `find_next_hop` and
 * `find_next_hop()`.
 */
export const codeLinks: CodeLink[] = [
  // src/node/mod.rs — routing and node lifecycle
  link("find_next_hop"),
  link("select_best_candidate"),
  link("destination_in_filters"),
  link("find_link_by_addr"),
  link("effective_ipv6_mtu"),
  link("transport_mtu"),
  link("estimated_mesh_size"),
  link("sendable_peers"),
  link("tree_state"),
  link("bloom_state"),
  link("coord_cache"),
  link("NodeState"),
  link("NodeError"),
  link("link_cost"),
  link("parent_hysteresis"),
  // Identity (src/identity/).
  link("NodeAddr"),
  link("node_addr"),
  link("FipsAddress"),
  link("from_pubkey"),
  link("from_node_addr"),
  // Message types (FMP / FSP).
  link("FilterAnnounce"),
  link("CoordsWarmup"),
  // Error-signal variants (FSP).
  link("CoordsRequired"),
  link("PathBroken"),
  link("MtuExceeded"),
];
