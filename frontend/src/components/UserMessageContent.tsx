import { messagePartKey, splitMessageContent } from "../lib/document-mentions";
import { DocumentMentionChip } from "./DocumentMentionChip";

interface UserMessageContentProps {
	content: string;
}

export function UserMessageContent({ content }: UserMessageContentProps) {
	const parts = splitMessageContent(content);

	return (
		<div className="text-sm leading-relaxed text-neutral-800">
			{parts.map((part, index) => {
				if (part.type === "mention") {
					return (
						<span key={messagePartKey(part, index)} className="mx-0.5 inline">
							<DocumentMentionChip filename={part.filename} />
						</span>
					);
				}
				return (
					<span
						key={messagePartKey(part, index)}
						className="whitespace-pre-wrap"
					>
						{part.value}
					</span>
				);
			})}
		</div>
	);
}
