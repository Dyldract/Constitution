export type Phase = "articles" | "amendments" | "done";

export type ProposalType = "article" | "amendment";

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
  /** Pour article: index 0-9, pour amendment: index 0-99 */
  index: number;
  text: string;
  authorId: string;
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
  /** Nom choisi par le créateur à la création */
  resultName: string | null;
  resultArticles: (string | null)[];
  resultAmendments: (string | null)[];
  preamble: string | null;
}

export const ARTICLES_COUNT = 10;
export const AMENDMENTS_COUNT = 100;
