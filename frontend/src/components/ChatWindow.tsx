import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Document, Message } from "../types";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { MessageBubble, StreamingBubble } from "./MessageBubble";

interface ChatWindowProps {
	messages: Message[];
	loading: boolean;
	error: string | null;
	streaming: boolean;
	streamingContent: string;
	documents: Document[];
	uploading: boolean;
	conversationId: string | null;
	onSend: (content: string) => void;
	onUpload: (files: File[]) => void;
	onSelectDocument: (id: string) => void;
}

function ErrorBanner({ error }: { error: string }) {
	return (
		<div className="mx-4 mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
			{error}
		</div>
	);
}

function DocumentStrip({
	documents,
	uploading,
}: {
	documents: Document[];
	uploading: boolean;
}) {
	if (documents.length === 0 && !uploading) {
		return null;
	}

	const label =
		documents.length === 1
			? "1 document in this deal"
			: `${documents.length} documents in this deal`;

	return (
		<div className="border-b border-neutral-100 px-3 py-2">
			<div className="flex items-center gap-2">
				<p className="text-xs text-neutral-500">{label}</p>
				{uploading && (
					<span className="flex items-center gap-1 text-xs text-neutral-400">
						<Loader2 className="h-3 w-3 animate-spin" />
						Uploading…
					</span>
				)}
			</div>
		</div>
	);
}

function ChatFooter({
	disabled,
	documents,
	uploading,
	onSend,
	onUpload,
}: {
	disabled: boolean;
	documents: Document[];
	uploading: boolean;
	onSend: (content: string) => void;
	onUpload: (files: File[]) => void;
}) {
	return (
		<div className="border-t border-neutral-200 bg-white">
			<DocumentStrip documents={documents} uploading={uploading} />
			<ChatInput
				onSend={onSend}
				onUpload={onUpload}
				disabled={disabled}
				uploading={uploading}
			/>
		</div>
	);
}

export function ChatWindow({
	messages,
	loading,
	error,
	streaming,
	streamingContent,
	documents,
	uploading,
	conversationId,
	onSend,
	onUpload,
	onSelectDocument,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const messagesLength = messages.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages and streamingContent are intentional triggers for auto-scroll
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messagesLength, streamingContent]);

	if (!conversationId) {
		return (
			<div className="flex flex-1 items-center justify-center bg-neutral-50">
				<div className="text-center">
					<p className="text-sm text-neutral-400">
						Select a conversation or create a new one
					</p>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center bg-white">
				<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
			</div>
		);
	}

	const footer = (
		<ChatFooter
			disabled={streaming}
			documents={documents}
			uploading={uploading}
			onSend={onSend}
			onUpload={onUpload}
		/>
	);

	if (messages.length === 0 && !streaming) {
		return (
			<div className="flex flex-1 flex-col bg-white">
				{error && <ErrorBanner error={error} />}
				<div className="flex flex-1 items-center justify-center overflow-y-auto">
					<EmptyState
						onUpload={onUpload}
						uploading={uploading}
						documents={documents}
						onSelectDocument={onSelectDocument}
					/>
				</div>
				{footer}
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col bg-white">
			{error && <ErrorBanner error={error} />}

			<div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
				<div className="mx-auto max-w-2xl space-y-1">
					{messages.map((message) => (
						<MessageBubble key={message.id} message={message} />
					))}
					{streaming && <StreamingBubble content={streamingContent} />}
				</div>
			</div>

			{footer}
		</div>
	);
}
