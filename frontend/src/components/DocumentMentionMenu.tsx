import { FileText } from "lucide-react";
import type { Document } from "../types";

interface DocumentMentionMenuProps {
	documents: Document[];
	highlightIndex: number;
	onSelect: (doc: Document) => void;
}

export function DocumentMentionMenu({
	documents,
	highlightIndex,
	onSelect,
}: DocumentMentionMenuProps) {
	if (documents.length === 0) {
		return (
			<div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
				<p className="text-xs text-neutral-500">No matching documents</p>
			</div>
		);
	}

	return (
		<div className="absolute bottom-full left-0 z-20 mb-2 max-h-48 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
			<p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
				Reference a document
			</p>
			{documents.map((doc, index) => (
				<button
					key={doc.id}
					type="button"
					className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
						index === highlightIndex
							? "bg-neutral-100 text-neutral-900"
							: "text-neutral-700 hover:bg-neutral-50"
					}`}
					onMouseDown={(e) => {
						e.preventDefault();
						onSelect(doc);
					}}
				>
					<FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
					<span className="truncate">{doc.filename}</span>
				</button>
			))}
		</div>
	);
}
