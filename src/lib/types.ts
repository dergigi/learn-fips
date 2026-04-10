export type NodeAddr = Uint8Array; // 16 bytes, SHA-256 truncated

export interface MeshNode {
  id: string;
  nodeAddr: NodeAddr;
  publicKey: Uint8Array; // 33 bytes compressed
  coords: NodeAddr[]; // ancestry path: [self, parent, ..., root]
  parent: string | null; // id of parent node, null if root
  peers: Set<string>; // ids of connected peers
  x: number;
  y: number;
}

export interface Link {
  a: string; // node id
  b: string; // node id
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
