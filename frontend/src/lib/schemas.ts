import { z } from "zod";

export const MessageSchema = z.object({
	id: z.string(),
	conversation_id: z.string(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	sources_cited: z.number().int().nonnegative(),
	created_at: z.string(),
});

export const DocumentSchema = z.object({
	id: z.string(),
	conversation_id: z.string(),
	filename: z.string(),
	page_count: z.number().int().nonnegative(),
	uploaded_at: z.string(),
});

export const DocumentInfoSchema = DocumentSchema.omit({
	conversation_id: true,
});

export const ConversationSchema = z.object({
	id: z.string(),
	title: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	document_count: z.number().int().nonnegative(),
});

export const ConversationDetailResponseSchema = z.object({
	id: z.string(),
	title: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	documents: z.array(DocumentInfoSchema),
});

export const MessageListSchema = z.array(MessageSchema);
export const ConversationListSchema = z.array(ConversationSchema);

export type Message = z.infer<typeof MessageSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationDetailResponse = z.infer<
	typeof ConversationDetailResponseSchema
>;

export type ConversationDetail = Omit<
	ConversationDetailResponse,
	"documents"
> & {
	documents: Document[];
};

export function conversationFromDetail(
	detail: ConversationDetailResponse,
): Conversation {
	return {
		id: detail.id,
		title: detail.title,
		created_at: detail.created_at,
		updated_at: detail.updated_at,
		document_count: detail.documents.length,
	};
}

export function conversationDetailFromResponse(
	detail: ConversationDetailResponse,
): ConversationDetail {
	return {
		id: detail.id,
		title: detail.title,
		created_at: detail.created_at,
		updated_at: detail.updated_at,
		documents: detail.documents.map((document) => ({
			...document,
			conversation_id: detail.id,
		})),
	};
}

export function parseApiData<T>(
	schema: z.ZodType<T>,
	data: unknown,
	label: string,
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new Error(`Invalid ${label} response: ${result.error.message}`);
	}
	return result.data;
}
