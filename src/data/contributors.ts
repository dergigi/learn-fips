/**
 * Main FIPS contributors, pulled from
 * https://github.com/jmcorgan/fips/graphs/contributors and curated to
 * everyone with 2+ commits so the list stays focused.
 *
 * When a contributor's `npub` is set, the card renders as a Nostr link
 * via njump.to. When it is not, the card falls back to the GitHub
 * profile so the section always has a working link. Drop in npubs as
 * they are confirmed, no redeploy logic needed.
 */

export interface Contributor {
  /** GitHub login (lowercase or as returned by the API). */
  github: string;
  /** Display name. */
  name: string;
  /** Short role or tagline. */
  role?: string;
  /** Bech32 npub. When set, the card links to njump.to instead of GitHub. */
  npub?: string;
}

export const contributors: Contributor[] = [
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
