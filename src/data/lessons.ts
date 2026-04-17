export interface Lesson {
  slug: string;
  number: number;
  title: string;
  description: string;
}

export const lessons: Lesson[] = [
  {
    slug: "1-what-is-fips",
    number: 1,
    title: "What is FIPS?",
    description:
      "The problem with centralized networks, and how a self-organizing mesh changes the picture.",
  },
  {
    slug: "2-identity",
    number: 2,
    title: "Identity",
    description: "Your keypair is your address. Generate one and watch the derivation pipeline.",
  },
  {
    slug: "3-protocol-stack",
    number: 3,
    title: "The Protocol Stack",
    description:
      "Four layers, each doing one job. Click through them to see how they fit together.",
  },
  {
    slug: "4-transports",
    number: 4,
    title: "Transports",
    description: "WiFi, Ethernet, UDP, Tor, serial. Same protocol, same mesh.",
  },
  {
    slug: "5-spanning-tree",
    number: 5,
    title: "Spanning Tree & Routing",
    description: "How the mesh self-organizes, builds coordinates, and routes packets.",
  },
  {
    slug: "6-encryption",
    number: 6,
    title: "Encryption",
    description:
      "Two layers of encryption: hop-by-hop and end-to-end. Watch a packet traverse the mesh.",
  },
  {
    slug: "7-putting-it-together",
    number: 7,
    title: "Putting It Together",
    description: "From cold start to steady state. The full lifecycle of a FIPS connection.",
  },
];
