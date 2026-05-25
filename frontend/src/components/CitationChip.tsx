import { FileText } from "lucide-react";
import type { Citation } from "../types";

interface CitationChipProps {
	citation: Citation;
	onClick?: () => void;
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
	const label = citation.label || citation.filename;
	const pageLabel = citation.page > 0 ? ` · p. ${citation.page}` : "";

	return (
		<button
			type="button"
			onClick={citation.verified ? onClick : undefined}
			disabled={!onClick || !citation.document_id || !citation.verified}
			className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-left text-xs transition-colors ${
				citation.verified
					? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
					: "border-amber-200 bg-amber-50 text-amber-900"
			} ${onClick && citation.document_id && citation.verified ? "cursor-pointer" : "cursor-default"}`}
			title={
				citation.verified
					? citation.excerpt || label
					: "This citation could not be verified against your documents"
			}
		>
			<FileText className="h-3 w-3 flex-shrink-0" />
			<span className="truncate font-medium">
				{label}
				{pageLabel}
			</span>
			{!citation.verified && (
				<span className="flex-shrink-0 text-[10px] uppercase tracking-wide opacity-70">
					unverified
				</span>
			)}
		</button>
	);
}
