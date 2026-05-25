import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { SseEventSchema } from "../lib/schemas";
import type { Message } from "../types";

export function useMessages(conversationId: string | null) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [streaming, setStreaming] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const abortRef = useRef<AbortController | null>(null);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setMessages([]);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const data = await api.fetchMessages(conversationId);
			setMessages(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load messages");
		} finally {
			setLoading(false);
		}
	}, [conversationId]);

	useEffect(() => {
		refresh();
		return () => {
			if (abortRef.current) {
				abortRef.current.abort();
			}
		};
	}, [refresh]);

	const send = useCallback(
		async (content: string) => {
			if (!conversationId || streaming) return;

			const userMessage: Message = {
				id: `temp-${Date.now()}`,
				conversation_id: conversationId,
				role: "user",
				content,
				verified_citations_count: 0,
				citations: [],
				trust_level: null,
				created_at: new Date().toISOString(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setStreaming(true);
			setStreamingContent("");
			setError(null);

			try {
				const response = await api.sendMessage(conversationId, content);

				if (!response.body) {
					throw new Error("No response body");
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let accumulated = "";
				let buffer = "";
				let receivedAssistantMessage = false;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || !trimmed.startsWith("data: ")) continue;

						const data = trimmed.slice(6);
						if (data === "[DONE]") continue;

						try {
							const parsed: unknown = JSON.parse(data);
							const event = SseEventSchema.safeParse(parsed);
							if (!event.success) continue;

							if (event.data.type === "content") {
								accumulated += event.data.content;
								setStreamingContent(accumulated);
							} else if (event.data.type === "message") {
								const assistantMessage = event.data.message;
								setMessages((prev) => {
									if (
										prev.some((message) => message.id === assistantMessage.id)
									) {
										return prev;
									}
									return [...prev, assistantMessage];
								});
								accumulated = "";
								setStreamingContent("");
								receivedAssistantMessage = true;
								setStreaming(false);
							} else if (event.data.type === "done") {
								accumulated = "";
								setStreamingContent("");
								setStreaming(false);
							}
						} catch {
							// Skip invalid JSON lines
						}
					}
				}

				const freshMessages = await api.fetchMessages(conversationId);
				setMessages(freshMessages);

				if (!receivedAssistantMessage && accumulated) {
					setError("Response completed without a saved assistant message.");
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setError(err instanceof Error ? err.message : "Failed to send message");
			} finally {
				setStreaming(false);
				setStreamingContent("");
			}
		},
		[conversationId, streaming],
	);

	return {
		messages,
		loading,
		error,
		streaming,
		streamingContent,
		send,
		refresh,
	};
}
