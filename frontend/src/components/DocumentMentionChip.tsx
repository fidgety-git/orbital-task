import { FileText, X } from "lucide-react";

interface DocumentMentionChipProps {
	filename: string;
	onRemove?: () => void;
}

export function DocumentMentionChip({
	filename,
	onRemove,
}: DocumentMentionChipProps) {
	return (
		<span className="inline-flex max-w-[200px] items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-800">
			<FileText className="h-3 w-3 flex-shrink-0 text-neutral-500" />
			<span className="truncate font-medium">{filename}</span>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					className="ml-0.5 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
					aria-label={`Remove ${filename}`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</span>
	);
}
