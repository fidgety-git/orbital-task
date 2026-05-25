import type { z } from "zod";
import {
	ConversationDetailResponseSchema,
	ConversationListSchema,
	DocumentSchema,
	MessageListSchema,
	conversationDetailFromResponse,
	conversationFromDetail,
	parseApiData,
} from "./schemas";
import type {
	Conversation,
	ConversationDetail,
	Document,
	Message,
} from "./schemas";

const BASE = "/api";

async function parseErrorResponse(response: Response): Promise<never> {
	const text = await response.text().catch(() => "Unknown error");

	try {
		const payload = JSON.parse(text) as { detail?: string };
		if (typeof payload.detail === "string") {
			throw new Error(payload.detail);
		}
	} catch (error) {
		if (error instanceof Error && !error.message.startsWith("API error")) {
			throw error;
		}
	}

	throw new Error(`API error ${response.status}: ${text}`);
}

async function handleJsonResponse<T>(
	response: Response,
	schema: z.ZodType<T>,
	label: string,
): Promise<T> {
	if (!response.ok) {
		await parseErrorResponse(response);
	}
	const data: unknown = await response.json();
	return parseApiData(schema, data, label);
}

async function handleEmptyResponse(response: Response): Promise<void> {
	if (!response.ok) {
		await parseErrorResponse(response);
	}
}

export async function fetchConversations(): Promise<Conversation[]> {
	const res = await fetch(`${BASE}/conversations`);
	return handleJsonResponse(res, ConversationListSchema, "conversations");
}

export async function createConversation(): Promise<Conversation> {
	const res = await fetch(`${BASE}/conversations`, {
		method: "POST",
	});
	const detail = await handleJsonResponse(
		res,
		ConversationDetailResponseSchema,
		"conversation",
	);
	return conversationFromDetail(detail);
}

export async function deleteConversation(id: string): Promise<void> {
	const res = await fetch(`${BASE}/conversations/${id}`, {
		method: "DELETE",
	});
	await handleEmptyResponse(res);
}

export async function fetchConversation(
	id: string,
): Promise<ConversationDetail> {
	const res = await fetch(`${BASE}/conversations/${id}`);
	const detail = await handleJsonResponse(
		res,
		ConversationDetailResponseSchema,
		"conversation",
	);
	return conversationDetailFromResponse(detail);
}

export async function fetchMessages(
	conversationId: string,
): Promise<Message[]> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`);
	return handleJsonResponse(res, MessageListSchema, "messages");
}

export async function sendMessage(
	conversationId: string,
	content: string,
): Promise<Response> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
	if (!res.ok) {
		await parseErrorResponse(res);
	}
	return res;
}

export async function uploadDocument(
	conversationId: string,
	file: File,
): Promise<Document> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(`${BASE}/conversations/${conversationId}/documents`, {
		method: "POST",
		body: formData,
	});
	return handleJsonResponse(res, DocumentSchema, "document");
}

export function getDocumentUrl(documentId: string): string {
	return `${BASE}/documents/${documentId}/content`;
}
