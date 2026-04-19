# Learn FIPS

Interactive guide to the **Free Internetworking Peering System (FIPS)** — a
self-organizing encrypted mesh protocol. Fourteen lessons walk you through the
ideas layer by layer, with runnable widgets (identity derivation, spanning
tree, greedy routing, bloom filters, link-cost rebalancing, recovery state
machine, wire-format inspector, IPv6-adapter MTU lab, threat lens, and a
cold-start walkthrough).

Live site: <https://learn-fips.vercel.app>

The protocol itself lives at <https://github.com/jmcorgan/fips>.
This repository is a teaching companion, not part of the protocol spec.

## What's inside

- **Lesson 1 — What is FIPS?** High-level motivation and how it differs from the classical internet.
- **Lesson 2 — Identity.** secp256k1 keypair → npub, `node_addr`, IPv6. Real crypto via [`@noble`](https://github.com/paulmillr/noble-curves).
- **Lesson 3 — The Protocol Stack.** Four layers, each with one job.
- **Lesson 4 — Transports.** WiFi, Ethernet, UDP, TCP, Tor, BLE, serial — one protocol.
- **Lesson 5 — Spanning Tree & Routing.** Root election, tree coordinates, greedy forwarding, bloom-filter reachability.
- **Lesson 6 — Encryption.** Noise IK (hop-by-hop) vs. Noise XK (end-to-end), animated.
- **Lesson 7 — Putting It Together.** Cold-start to steady state.
- **Lesson 8 — When Things Go Wrong.** Coordinate warmup, error signals, and how the mesh heals.
- **Lesson 9 — Reading the Wire.** Byte-level packet layout with an interactive field toggler.
- **Lesson 10 — Measuring the Mesh.** MMP, link cost, and how metrics push traffic onto better parents.
- **Lesson 11 — Who Sees What.** Four adversary classes and what each can actually read off the wire.
- **Lesson 12 — Talking to Legacy Apps.** The IPv6 adapter, the `fips-gateway` NAT sidecar, and unmodified clients.
- **Lesson 13 — Try It.** Install a node, join the public test mesh, and send your first packet.
- **Lesson 14 — Connect and Contribute.** Find the people building FIPS and help the protocol grow.

## Stack

- [Astro](https://astro.build) 6 + [React](https://react.dev) 19 for islands
- [Tailwind CSS](https://tailwindcss.com) v4 via the Vite plugin
- [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1) + [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) for identity crypto
- [framer-motion](https://www.framer.com/motion/) for a handful of animations
- [Vitest](https://vitest.dev) for unit tests
- [ESLint](https://eslint.org) + [Prettier](https://prettier.io) with a
  [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) pre-commit
  that runs both on staged files

## Running locally

Requires Node.js ≥ 22.12.

```sh
npm install
npm run dev       # http://localhost:4321
```

## Scripts

| Command                 | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Start the Astro dev server                               |
| `npm run build`         | Build to `./dist/`                                       |
| `npm run preview`       | Preview the production build locally                     |
| `npm run check`         | `astro check` — type-check `.astro`, `.ts`, `.tsx` files |
| `npm run lint`          | ESLint across the repo                                   |
| `npm run lint:fix`      | Same, with `--fix`                                       |
| `npm run format`        | Prettier write-in-place                                  |
| `npm run format:check`  | Prettier check-only                                      |
| `npm test`              | Run the Vitest suite once                                |
| `npm run test:watch`    | Run tests in watch mode                                  |
| `npm run fetch-avatars` | Refresh Nostr profile pictures for the contributors page |

## Project layout

```
src/
├── components/        interactive islands (Quiz, MeshSimulator, IdentityGenerator, …)
├── data/              lessons, quizzes, glossary, contributors, codeLinks, nostr-avatars
├── layouts/           Base.astro (nav, footer, meta tags)
├── lib/               crypto, bloom, mesh, constants, types, progress, acronyms — all tested where applicable
├── pages/
│   ├── index.astro
│   └── lessons/       1-what-is-fips.astro … 14-connect.astro
└── styles/            global.css (Tailwind theme)

scripts/               one-off Node scripts (e.g. fetch-nostr-avatars.mjs)
tests/                 Vitest unit tests mirroring src/lib/
```

## Contributing

Issues and PRs welcome. Before pushing:

```sh
npm run check && npm run lint && npm test
```

CI runs the same on every PR.

## License

[MIT](./LICENSE) © Gigi
