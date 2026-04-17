#!/usr/bin/env node
/**
 * Fetch kind:0 (profile metadata) from public relays for every
 * contributor in src/data/contributors.ts that has an `npub`, extract
 * the `picture` URL, and write it to src/data/nostr-avatars.json.
 *
 * The site imports that JSON statically at build time. Re-run whenever
 * someone updates their profile picture and you want the site to pick
 * it up:
 *
 *     npm run fetch-avatars
 */

import { nip19 } from "nostr-tools";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRIBUTORS_SRC = resolve(__dirname, "../src/data/contributors.ts");
const OUT_PATH = resolve(__dirname, "../src/data/nostr-avatars.json");

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.band",
];

/** How long to wait per relay before giving up on its stream. */
const PER_RELAY_TIMEOUT_MS = 6_000;

async function readNpubs() {
  const src = await readFile(CONTRIBUTORS_SRC, "utf8");
  const matches = [...src.matchAll(/npub:\s*"(npub1[0-9a-z]+)"/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

function npubToHex(npub) {
  const { type, data } = nip19.decode(npub);
  if (type !== "npub") throw new Error(`not an npub: ${npub}`);
  return data;
}

/**
 * Query a single relay for kind:0 events from the given authors.
 * Resolves with `{ pubkey -> { picture, created_at } }`.
 */
function fetchFromRelay(url, authors) {
  return new Promise((resolveRelay) => {
    const subId = randomUUID().replace(/-/g, "").slice(0, 16);
    const found = {};
    let settled = false;
    const ws = new WebSocket(url);

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        ws.send(JSON.stringify(["CLOSE", subId]));
      } catch {
        // ignore
      }
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolveRelay(found);
    };

    const timer = setTimeout(finish, PER_RELAY_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      const req = ["REQ", subId, { kinds: [0], authors }];
      ws.send(JSON.stringify(req));
    });

    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      } catch {
        return;
      }
      if (!Array.isArray(msg)) return;
      if (msg[0] === "EVENT" && msg[1] === subId) {
        const event = msg[2];
        if (!event || event.kind !== 0) return;
        try {
          const meta = JSON.parse(event.content);
          if (typeof meta.picture === "string" && meta.picture.length > 0) {
            const prev = found[event.pubkey];
            if (!prev || prev.created_at < event.created_at) {
              found[event.pubkey] = { picture: meta.picture, created_at: event.created_at };
            }
          }
        } catch {
          // ignore malformed metadata
        }
      } else if (msg[0] === "EOSE" && msg[1] === subId) {
        clearTimeout(timer);
        finish();
      } else if (msg[0] === "NOTICE") {
        // Some relays complain about filter shape. Nothing to do but
        // move on and let other relays answer.
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      finish();
    });
    ws.addEventListener("close", () => {
      clearTimeout(timer);
      finish();
    });
  });
}

async function fetchProfiles(npubs) {
  const hexByNpub = new Map(npubs.map((n) => [n, npubToHex(n)]));
  const npubByHex = new Map([...hexByNpub.entries()].map(([n, h]) => [h, n]));
  const authors = [...hexByNpub.values()];

  const relayResults = await Promise.all(RELAYS.map((u) => fetchFromRelay(u, authors)));

  // Merge, keeping the newest event per author across relays.
  const merged = {};
  for (const r of relayResults) {
    for (const [hex, { picture, created_at }] of Object.entries(r)) {
      const prev = merged[hex];
      if (!prev || prev.created_at < created_at) merged[hex] = { picture, created_at };
    }
  }

  const out = {};
  for (const [hex, { picture }] of Object.entries(merged)) {
    const npub = npubByHex.get(hex);
    if (npub) out[npub] = picture;
  }
  return out;
}

async function main() {
  const npubs = await readNpubs();
  if (npubs.length === 0) {
    console.error("No npubs found in contributors.ts");
    process.exit(1);
  }
  console.log(`Fetching kind:0 metadata for ${npubs.length} npubs from ${RELAYS.length} relays…`);
  const avatars = await fetchProfiles(npubs);
  for (const n of npubs) {
    const got = avatars[n] ? "✓" : "✗";
    console.log(`  ${got} ${n}${avatars[n] ? `  →  ${avatars[n]}` : ""}`);
  }
  await writeFile(OUT_PATH, JSON.stringify(avatars, null, 2) + "\n", "utf8");
  console.log(`Wrote ${Object.keys(avatars).length} avatars to ${OUT_PATH}`);
  const missing = npubs.filter((n) => !avatars[n]);
  if (missing.length > 0) {
    console.warn(`Missing ${missing.length}. Re-run or add a relay that stores them.`);
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
