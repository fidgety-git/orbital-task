import { describe, expect, it } from "vitest";
import {
	buildMentionToken,
	createEmptySegments,
	getMentionQuery,
	handleComposerBackspace,
	insertMentionInSegments,
	parseMentionTokens,
	serializeSegments,
	splitMessageContent,
	updateActiveText,
} from "./document-mentions";

describe("mention tokens", () => {
	it("builds and parses mention tokens", () => {
		const token = buildMentionToken("doc-1", "Lease.pdf");
		expect(token).toBe("@[Lease.pdf](document:doc-1)");
		expect(parseMentionTokens(token)).toEqual([
			{
				filename: "Lease.pdf",
				documentId: "doc-1",
				start: 0,
				end: token.length,
			},
		]);
	});
});

describe("composer segments", () => {
	it("serializes text and mention segments", () => {
		const segments = [
			{ type: "text" as const, value: "Compare " },
			{ type: "mention" as const, id: "doc-1", filename: "Lease.pdf" },
			{ type: "text" as const, value: " with title report" },
		];

		expect(serializeSegments(segments)).toBe(
			"Compare @[Lease.pdf](document:doc-1) with title report",
		);
	});

	it("inserts a mention into active text at the @ query", () => {
		const segments = updateActiveText(createEmptySegments(), "Compare @lea");

		const next = insertMentionInSegments(
			segments,
			{ id: "doc-1", filename: "Lease.pdf" },
			8,
			12,
		);

		expect(serializeSegments(next)).toBe(
			"Compare @[Lease.pdf](document:doc-1)",
		);
	});

	it("deletes the preceding mention when backspacing on empty trailing text", () => {
		const segments = [
			{ type: "text" as const, value: "Compare " },
			{ type: "mention" as const, id: "doc-1", filename: "Lease.pdf" },
			{ type: "text" as const, value: "" },
		];

		expect(handleComposerBackspace(segments)).toEqual([
			{ type: "text", value: "Compare " },
		]);
	});
});

describe("getMentionQuery", () => {
	it("returns the active @ query and start index", () => {
		const text = "Compare @lea";
		expect(getMentionQuery(text, text.length)).toEqual({
			query: "lea",
			start: 8,
		});
	});

	it("returns null when there is no active mention query", () => {
		expect(getMentionQuery("Compare lease terms", 19)).toBeNull();
	});
});

describe("splitMessageContent", () => {
	it("splits text around mention tokens for rendering", () => {
		const content = "See @[Lease.pdf](document:doc-1) for terms";

		expect(splitMessageContent(content)).toEqual([
			{ type: "text", value: "See " },
			{ type: "mention", filename: "Lease.pdf", documentId: "doc-1" },
			{ type: "text", value: " for terms" },
		]);
	});
});
