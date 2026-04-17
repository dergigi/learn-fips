/**
 * People (and the project account) to reach out to on Nostr.
 *
 * The human list is pulled from
 * https://github.com/jmcorgan/fips/graphs/contributors. The project
 * account comes first since it is the single most useful follow for
 * anyone new to FIPS; contributors follow, roughly by commit count.
 *
 * When a contributor's `npub` is set, the card renders as a Nostr link
 * via njump.to. When it is not, the card falls back to the GitHub
 * profile so the section always has a working link.
 *
 * Avatars come from `nostr-avatars.json`, refreshed via
 * `npm run fetch-avatars` (kind:0 events from public relays). Anything
 * missing from that file falls back to the GitHub avatar.
 */

import nostrAvatars from "./nostr-avatars.json";

export interface Contributor {
  /** Display name. */
  name: string;
  /** GitHub login. Optional for non-human accounts like the project itself. */
  github?: string;
  /** Short role or tagline. */
  role?: string;
  /** Bech32 npub. When set, the card links to njump.to instead of GitHub. */
  npub?: string;
}

const avatars = nostrAvatars as Record<string, string>;

/**
 * Resolve the profile link, a subtitle, and an avatar URL for a card.
 * Keeps the rendering path in the Astro page tiny and avoids repeating
 * the fallback rules in multiple places.
 */
export function resolveContributor(c: Contributor): {
  href: string | null;
  subtitle: string;
  avatar: string | null;
} {
  const nostrHref = c.npub ? `https://njump.to/${c.npub}` : null;
  const githubHref = c.github ? `https://github.com/${c.github}` : null;
  const href = nostrHref ?? githubHref;

  const subtitle = c.npub
    ? `${c.npub.slice(0, 16)}…${c.npub.slice(-6)}`
    : c.github
      ? `github.com/${c.github}`
      : "";

  // Prefer the Nostr avatar (if we have a cached one), then GitHub.
  const nostrAvatar = c.npub ? (avatars[c.npub] ?? null) : null;
  const githubAvatar = c.github ? `https://github.com/${c.github}.png?size=160` : null;
  const avatar = nostrAvatar ?? githubAvatar;

  return { href, subtitle, avatar };
}

export const contributors: Contributor[] = [
  {
    name: "FIPS",
    role: "Project",
    npub: "npub1y0gja7r4re0wyelmvdqa03qmjs62rwvcd8szzt4nf4t2hd43969qj000ly",
  },
  {
    github: "jmcorgan",
    name: "Johnathan Corgan",
    role: "Author",
    npub: "npub19wavu4f7l6l43h24jyskn7fvzy37kcfp67aqjtmv2qgy4lp34nhsda8p6k",
  },
  {
    github: "alexxie16",
    name: "Alex Xie",
    npub: "npub1q4hnxfzu5nxylg7p6mj40hvw4ec53z0ncdpre0t0huyl8s8zqrfquvz7zr",
  },
  {
    github: "v0l",
    name: "Kieran",
    npub: "npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49",
  },
  {
    github: "dskvr",
    name: "sandwich",
    npub: "npub1uac67zc9er54ln0kl6e4qp2y6ta3enfcg7ywnayshvlw9r5w6ehsqq99rx",
  },
  {
    github: "SatsAndSports",
    name: "SatsAndSports",
    npub: "npub1zthq85gksjsjthv8h6rec2qeqs2mu0emrm9xknkhgw7hfl7csrnq6wxm56",
  },
  {
    github: "Origami74",
    name: "Arjen",
    npub: "npub1hw6amg8p24ne08c9gdq8hhpqx0t0pwanpae9z25crn7m9uy7yarse465gr",
  },
  {
    github: "sh1ftred",
    name: "red",
    npub: "npub1ftt05tgku25m2akgvw6v7aqy5ux5mseqcrzy05g26ml43xf74nyqsredsh",
  },
  {
    github: "0ceanSlim",
    name: "OceanSlim",
    npub: "npub1zmc6qyqdfnllhnzzxr5wpepfpnzcf8q6m3jdveflmgruqvd3qa9sjv7f60",
  },
  {
    name: "c03rad0r",
    npub: "npub1c03rad0r6q833vh57kyd3ndu2jry30nkr0wepqfpsm05vq7he25slryrnw",
  },
];
