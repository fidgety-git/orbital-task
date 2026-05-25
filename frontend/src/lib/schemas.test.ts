import { describe, expect, it } from "vitest";
import {
	ConversationDetailResponseSchema,
	conversationFromDetail,
	parseApiData,
} from "./schemas";

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
