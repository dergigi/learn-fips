/**
 * People (and the project account) to reach out to on Nostr.
 *
 * The human list is pulled from
 * https://github.com/jmcorgan/fips/graphs/contributors, curated to
 * everyone with 2+ commits so the section stays focused. The project
 * account comes first since it is the single most useful follow for
 * anyone new to FIPS.
 *
 * When a contributor's `npub` is set, the card renders as a Nostr link
 * via njump.to. When it is not, the card falls back to the GitHub
 * profile so the section always has a working link. Drop in npubs as
 * they are confirmed — no rendering changes needed.
 */

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
  },
  {
    github: "v0l",
    name: "Kieran",
  },
  {
    github: "dskvr",
    name: "sandwich",
  },
  {
    github: "SatsAndSports",
    name: "SatsAndSports",
  },
  {
    github: "Origami74",
    name: "Arjen",
  },
];
