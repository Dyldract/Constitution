export type Phase = "amendments" | "done";

export type ProposalType = "amendment";

export interface Player {
  id: string;
  name: string;
  roomId: string;
  joinedAt: number;
}

export interface Proposal {
  id: string;
  roomId: string;
  type: ProposalType;
  /** index 0..99 pour amendment */
  index: number;
  text: string;
  authorId: string;
  /** Nom de l'auteur (si la table n'a que author_name) */
  authorName?: string;
  createdAt: number;
}

export interface Vote {
  id: string;
  roomId: string;
  playerId: string;
  type: ProposalType;
  index: number;
  /** true = oui, false = non */
  value: boolean;
  createdAt: number;
}

export interface Room {
  id: string;
  code: string;
  phase: Phase;
  createdAt: number;
  isPublic: boolean;
  /** Nom choisi par le créateur à la création */
  resultName: string | null;
  resultArticles: (string | null)[];
  resultAmendments: (string | null)[];
  preamble: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName?: string;
  text: string;
  createdAt: number;
}

export const AMENDMENTS_COUNT = 100;
