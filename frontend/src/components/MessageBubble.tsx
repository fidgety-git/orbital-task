import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import type { Citation, Message } from "../types";
import { CitationChip } from "./CitationChip";
import { TrustBanner } from "./TrustBanner";
import { UserMessageContent } from "./UserMessageContent";

interface MessageBubbleProps {
	message: Message;
	onCitationClick?: (citation: Citation) => void;
}

export function MessageBubble({
	message,
	onCitationClick,
}: MessageBubbleProps) {
	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[75%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5">
					<UserMessageContent content={message.content} />
				</div>
			</motion.div>
		);
	}

	const verifiedCount = message.verified_citations_count;
	const unverifiedCount = message.citations.length - verifiedCount;

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				<TrustBanner trustLevel={message.trust_level} />
				<div className="prose">
					<Streamdown>{message.content}</Streamdown>
				</div>

				{message.citations.length > 0 && (
					<>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{message.citations.map((citation, index) => (
								<CitationChip
									key={`${citation.document_id}-${citation.page}-${index}`}
									citation={citation}
									onClick={
										onCitationClick
											? () => onCitationClick(citation)
											: undefined
									}
								/>
							))}
						</div>
						<p className="mt-1.5 text-xs text-neutral-400">
							{verifiedCount} verified source{verifiedCount !== 1 ? "s" : ""}
							{unverifiedCount > 0 ? ` · ${unverifiedCount} unverified` : ""}
						</p>
					</>
				)}
			</div>
		</motion.div>
	);
}

interface StreamingBubbleProps {
	content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
	return (
		<div className="flex gap-3 py-1.5">
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{content ? (
					<div className="prose">
						<Streamdown mode="streaming">{content}</Streamdown>
					</div>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
				<span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />
			</div>
		</div>
	);
}
