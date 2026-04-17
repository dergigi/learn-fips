/**
 * Source-of-truth links for FIPS code symbols referenced in the lessons.
 *
 * Every entry maps a literal identifier (function, method, type, binary) to
 * a deep link into the upstream repo, pinned to a specific commit so the
 * line numbers remain correct even after the file drifts.
 *
 * To add a symbol: find it at the pinned commit (or update the commit), grab
 * the permalink from GitHub ("Copy permalink" on the line), and add an entry
 * below. Keep the list curated — only symbols that actually show up inside
 * `<code>` elements in the lessons are worth mapping.
 */

/**
 * Commit the line numbers below are pinned to. When you refresh this table,
 * update this SHA and re-capture permalinks so every entry moves atomically.
 */
export const FIPS_PIN = "745b523ac6a9c9b469348baa4c92cc4bfc18fd75";

const REPO = "https://github.com/jmcorgan/fips";

function fipsSrc(path: string, line: number): string {
  return `${REPO}/blob/${FIPS_PIN}/${path}#L${line}`;
}

/**
 * Fallback for symbols that are not pinned to a single definition, or that
 * live in enough places that a search is more useful than one permalink.
 * Example: `link_cost` is read all over the codebase, so a repo-scoped code
 * search beats a single call site.
 */
function fipsSearch(symbol: string): string {
  const q = encodeURIComponent(`repo:jmcorgan/fips ${symbol}`);
  return `https://github.com/search?q=${q}&type=code`;
}

export interface CodeLink {
  /** The literal token as it appears in prose, e.g. "find_next_hop". */
  symbol: string;
  /** Deep link into the upstream repo, pinned to FIPS_PIN. */
  url: string;
  /** Short hover label. Kept short; the code font signals "this is code". */
  label: string;
}

/**
 * Symbol → permalink. Ordered roughly by where each symbol first appears in
 * the lessons, for easy cross-reference when editing.
 *
 * Literals MUST match the token as written in prose. When a symbol can show
 * up with or without parentheses, register the bare identifier; the decorator
 * uses word boundaries, so `find_next_hop` matches both `find_next_hop` and
 * `find_next_hop()`.
 */
export const codeLinks: CodeLink[] = [
  // src/node/mod.rs — routing and node lifecycle
  {
    symbol: "find_next_hop",
    url: fipsSearch("find_next_hop"),
    label: "find_next_hop across the fips repo (GitHub code search)",
  },
  {
    symbol: "select_best_candidate",
    url: fipsSrc("src/node/mod.rs", 1663),
    label: "Node::select_best_candidate in src/node/mod.rs",
  },
  {
    symbol: "destination_in_filters",
    url: fipsSrc("src/node/mod.rs", 1711),
    label: "Node::destination_in_filters in src/node/mod.rs",
  },
  {
    symbol: "find_link_by_addr",
    url: fipsSrc("src/node/mod.rs", 1336),
    label: "Node::find_link_by_addr in src/node/mod.rs",
  },
  {
    symbol: "effective_ipv6_mtu",
    url: fipsSrc("src/node/mod.rs", 990),
    label: "Node::effective_ipv6_mtu in src/node/mod.rs",
  },
  {
    symbol: "transport_mtu",
    url: fipsSrc("src/node/mod.rs", 1000),
    label: "Node::transport_mtu in src/node/mod.rs",
  },
  {
    symbol: "estimated_mesh_size",
    url: fipsSrc("src/node/mod.rs", 1063),
    label: "Node::estimated_mesh_size in src/node/mod.rs",
  },
  {
    symbol: "sendable_peers",
    url: fipsSrc("src/node/mod.rs", 1437),
    label: "Node::sendable_peers in src/node/mod.rs",
  },
  {
    symbol: "tree_state",
    url: fipsSrc("src/node/mod.rs", 1039),
    label: "Node::tree_state in src/node/mod.rs",
  },
  {
    symbol: "bloom_state",
    url: fipsSrc("src/node/mod.rs", 1051),
    label: "Node::bloom_state in src/node/mod.rs",
  },
  {
    symbol: "coord_cache",
    url: fipsSrc("src/node/mod.rs", 1134),
    label: "Node::coord_cache in src/node/mod.rs",
  },
  {
    symbol: "NodeState",
    url: fipsSrc("src/node/mod.rs", 147),
    label: "enum NodeState in src/node/mod.rs",
  },
  {
    symbol: "NodeError",
    url: fipsSrc("src/node/mod.rs", 61),
    label: "enum NodeError in src/node/mod.rs",
  },
  {
    symbol: "link_cost",
    url: fipsSearch("link_cost"),
    label: "link_cost across the fips repo (GitHub code search)",
  },
];
