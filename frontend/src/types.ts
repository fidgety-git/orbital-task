export type {
	Citation,
	Conversation,
	ConversationDetail,
	Document,
	Message,
	TrustLevel,
} from "./lib/schemas";

export interface CitationTarget {
	documentId: string;
	page: number;
	excerpt: string;
}
