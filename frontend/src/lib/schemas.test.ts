import { describe, expect, it } from "vitest";
import {
	ConversationDetailResponseSchema,
	MessageSchema,
	conversationFromDetail,
	parseApiData,
} from "./schemas";

describe("MessageSchema", () => {
	it("accepts assistant messages with citations and trust level", () => {
		const message = parseApiData(
			MessageSchema,
			{
				id: "msg1",
				conversation_id: "conv1",
				role: "assistant",
				content: "The rent is £850,000 per annum.",
				verified_citations_count: 1,
				citations: [
					{
						document_id: "doc1",
						filename: "Lease.pdf",
						page: 4,
						excerpt: "£850,000",
						label: "Section 3.1",
						verified: true,
					},
				],
				trust_level: "high",
				created_at: "2024-01-01T00:00:00Z",
			},
			"message",
		);

		expect(message.trust_level).toBe("high");
	});

	it("rejects messages with missing citation fields", () => {
		expect(() =>
			parseApiData(
				MessageSchema,
				{
					id: "msg1",
					conversation_id: "conv1",
					role: "assistant",
					content: "Answer",
					verified_citations_count: 0,
					citations: [{ filename: "Lease.pdf" }],
					trust_level: null,
					created_at: "2024-01-01T00:00:00Z",
				},
				"message",
			),
		).toThrow(/Invalid message response/);
	});
});

describe("conversationFromDetail", () => {
	it("maps create response shape to sidebar conversation", () => {
		const conversation = conversationFromDetail(
			parseApiData(
				ConversationDetailResponseSchema,
				{
					id: "conv1",
					title: "New Conversation",
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
					documents: [],
				},
				"conversation",
			),
		);

		expect(conversation.document_count).toBe(0);
		expect(conversation.id).toBe("conv1");
	});
});
