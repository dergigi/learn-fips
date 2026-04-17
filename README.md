# Learn FIPS

Interactive guide to the **Free Internetworking Peering System (FIPS)** — a
self-organizing encrypted mesh protocol. Seven lessons walk you through the
ideas layer by layer, with runnable simulations (identity derivation, spanning
tree, greedy routing, bloom filters, packet-crossing animation).

Live site: <https://learn-fips.vercel.app>

The protocol itself lives at <https://github.com/jmcorgan/fips>.
This repository is a teaching companion, not part of the protocol spec.

## What's inside

- **Lesson 1 — What is FIPS?** High-level motivation and how it differs from the classical internet.
- **Lesson 2 — Identity.** secp256k1 keypair → npub, `node_addr`, IPv6. Real crypto via [`@noble`](https://github.com/paulmillr/noble-curves).
- **Lesson 3 — Protocol Stack.** Four layers, each with one job.
- **Lesson 4 — Transports.** WiFi, Ethernet, UDP, Tor, serial — one protocol.
- **Lesson 5 — Spanning Tree & Routing.** Root election, tree coordinates, greedy forwarding, bloom-filter reachability.
- **Lesson 6 — Encryption.** Noise IK (hop-by-hop) vs. Noise XK (end-to-end), animated.
- **Lesson 7 — Putting It Together.** Cold-start to steady state.

## Stack

- [Astro](https://astro.build) 6 + [React](https://react.dev) 19 for islands
- [Tailwind CSS](https://tailwindcss.com) v4 via the Vite plugin
- [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1) + [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) for identity crypto
- [framer-motion](https://www.framer.com/motion/) for a handful of animations
- [Vitest](https://vitest.dev) for unit tests

## Running locally

Requires Node.js ≥ 22.12.

```sh
npm install
npm run dev       # http://localhost:4321
```

## Scripts

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start the Astro dev server                               |
| `npm run build`     | Build to `./dist/`                                       |
| `npm run preview`   | Preview the production build locally                     |
| `npm run check`     | `astro check` — type-check `.astro`, `.ts`, `.tsx` files |
| `npm test`          | Run the Vitest suite once                                |
| `npm run test:watch`| Run tests in watch mode                                  |

## Project layout

```
src/
├── components/        interactive islands (Quiz, MeshSimulator, …)
├── data/              lessons.ts, quizzes.ts (single source of truth)
├── layouts/           Base.astro (nav, footer, meta tags)
├── lib/               crypto, bloom, mesh — all tested
├── pages/
│   ├── index.astro
│   └── lessons/       1-what-is-fips.astro … 7-putting-it-together.astro
└── styles/            global.css (Tailwind theme)

tests/                 Vitest unit tests mirroring src/lib/
```

## Contributing

Issues and PRs welcome. Before pushing:

```sh
npm run check && npm test
```

CI runs the same on every PR.

## License

[MIT](./LICENSE) © Gigi
